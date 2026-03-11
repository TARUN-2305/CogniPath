"""
cs_core/extractor.py
Tree-of-Thought Reasoning Path Extractor with beam search.

Falls back to a rule-based extractor when no LLM API key is configured,
so the code still runs on a machine without an API key (useful for demos).
"""
import json
import os
import re
import uuid
from typing import Any, Dict, List, Optional

# AutoGen ConversableAgent is only created when an API key is present.
try:
    import autogen
    _AUTOGEN_AVAILABLE = True
except ImportError:
    _AUTOGEN_AVAILABLE = False

from api.schemas import (
    ReasoningStep,
    ReasoningPathResponse,
    ThoughtNode,
    ThoughtTree,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_id() -> str:
    return uuid.uuid4().hex[:8]

def _parse_step_json(raw: str) -> Optional[Dict]:
    """Robustly extract the first JSON object from an LLM response string."""
    match = re.search(r"\{.*?\}", raw, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# Rule-based fallback (no LLM required)
# ---------------------------------------------------------------------------

_STEP_TYPE_KEYWORDS = {
    "recognition": ["recogni", "identif", "note", "observe", "given", "states"],
    "application": ["appli", "use", "apply", "formula", "law", "principle", "using"],
    "calculation": ["calculat", "comput", "multipl", "divid", "add", "subtract", "sqrt", "eq"],
    "inference": ["therefor", "hence", "so", "thus", "infer", "conclude"],
    "verification": ["check", "verif", "confirm", "consistent", "correct"],
    "conclusion": ["final", "answer", "result", "get", "velocity", "speed", "value"],
}

def _infer_type(text: str) -> str:
    lower = text.lower()
    for step_type, keywords in _STEP_TYPE_KEYWORDS.items():
        if any(k in lower for k in keywords):
            return step_type
    return "inference"

def _rule_based_extract(question: str, student_answer: str, domain: str) -> List[Dict]:
    """
    Lightweight heuristic: split the student answer into sentences and treat
    each sentence as a reasoning step.
    """
    sentences = [s.strip() for s in re.split(r'[.;]', student_answer) if len(s.strip()) > 8]
    steps = []
    for i, sent in enumerate(sentences):
        step_type = "conclusion" if i == len(sentences) - 1 else _infer_type(sent)
        steps.append({
            "text": sent,
            "type": step_type,
            "confidence": 0.70 if step_type != "conclusion" else 0.90,
        })
    if not steps:
        steps.append({"text": student_answer[:200], "type": "conclusion", "confidence": 0.50})
    return steps


# ---------------------------------------------------------------------------
# Main Extractor
# ---------------------------------------------------------------------------

class ReasoningPathExtractor:
    """
    Extracts a step-by-step reasoning path using Tree-of-Thought beam search.
    When an API key is available, it uses an LLM (AutoGen ConversableAgent).
    Otherwise falls back to rule-based extraction.
    """

    def __init__(
        self,
        llm_config: Optional[Dict[str, Any]] = None,
        beam_size: int = 3,
        max_steps: int = 8,
    ):
        self.beam_size = beam_size
        self.max_steps = max_steps
        self._use_llm = False

        api_key = (llm_config or {}).get("api_key") or os.environ.get("OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if _AUTOGEN_AVAILABLE and llm_config and api_key and api_key != "placeholder-key-for-compilation":
            try:
                self.agent = autogen.ConversableAgent(
                    name="reasoning_extractor",
                    llm_config=llm_config,
                    human_input_mode="NEVER",
                )
                self._use_llm = True
            except Exception:
                self._use_llm = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract(
        self,
        question: str,
        student_answer: str,
        domain: str = "general",
    ) -> ReasoningPathResponse:
        """
        Main entry point. Returns a ReasoningPathResponse with steps + thought_tree.
        """
        path_id = f"path_{abs(hash(student_answer)) % 100_000}"

        if self._use_llm:
            return self._llm_extract(path_id, question, student_answer, domain)
        else:
            return self._fallback_extract(path_id, question, student_answer, domain)

    # ------------------------------------------------------------------
    # LLM-based extraction
    # ------------------------------------------------------------------

    def _llm_extract(self, path_id: str, question: str, answer: str, domain: str) -> ReasoningPathResponse:
        initial = self._generate_initial_step_llm(question, answer, domain)
        if not initial:
            return self._fallback_extract(path_id, question, answer, domain)

        beams = [{"steps": [initial], "score": initial.get("confidence", 0.5)}]
        all_nodes: Dict[str, ThoughtNode] = {}
        root_id = _node_id()

        # Root node
        all_nodes[root_id] = ThoughtNode(
            node_id=root_id,
            step_num=1,
            text=initial["text"],
            type=initial.get("type", "recognition"),
            confidence=initial.get("confidence", 0.5),
            path_score=initial.get("confidence", 0.5),
            is_selected=True,
            children=[],
        )
        beam_node_ids = [root_id]   # parallel tracking of tree node IDs

        for _ in range(self.max_steps - 1):
            new_beams, new_beam_ids = [], []
            for beam, parent_nid in zip(beams, beam_node_ids):
                if beam["steps"][-1].get("type") == "conclusion":
                    new_beams.append(beam)
                    new_beam_ids.append(parent_nid)
                    continue
                next_step = self._expand_step_llm(beam, question, answer, domain)
                if next_step:
                    child_id = _node_id()
                    child_node = ThoughtNode(
                        node_id=child_id,
                        step_num=len(beam["steps"]) + 1,
                        text=next_step["text"],
                        type=next_step.get("type", "inference"),
                        confidence=next_step.get("confidence", 0.5),
                        path_score=beam["score"] + next_step.get("confidence", 0.5),
                        is_selected=False,
                        children=[],
                    )
                    all_nodes[parent_nid].children.append(child_id)
                    all_nodes[child_id] = child_node
                    new_beams.append({"steps": beam["steps"] + [next_step], "score": child_node.path_score})
                    new_beam_ids.append(child_id)

            if not new_beams:
                break
            new_beams.sort(key=lambda b: b["score"], reverse=True)
            beams = new_beams[: self.beam_size]
            beam_node_ids = new_beam_ids[: self.beam_size]

        return self._build_response(path_id, beams, all_nodes, root_id)

    def _generate_initial_step_llm(self, question: str, answer: str, domain: str) -> Optional[Dict]:
        prompt = f"""
You are an expert at reconstructing student reasoning from their answers.

Question: {question}
Student Answer: {answer}
Domain: {domain}

Infer the FIRST step the student likely took. Output ONLY a JSON object:
{{"text": "<step description>", "type": "<recognition|application|calculation|inference|verification|conclusion>", "confidence": <0-1>}}
"""
        raw = self.agent.generate_reply(messages=[{"content": prompt, "role": "user"}])
        return _parse_step_json(str(raw))

    def _expand_step_llm(self, beam: Dict, question: str, answer: str, domain: str) -> Optional[Dict]:
        steps_text = "\n".join(f"{i+1}. {s['text']}" for i, s in enumerate(beam["steps"]))
        prompt = f"""
Question: {question}
Student Answer: {answer}
Domain: {domain}

Steps inferred so far:
{steps_text}

Infer the NEXT step. If reasoning is complete, use type "conclusion".
Output ONLY JSON: {{"text": "...", "type": "...", "confidence": <0-1>}}
"""
        raw = self.agent.generate_reply(messages=[{"content": prompt, "role": "user"}])
        return _parse_step_json(str(raw))

    # ------------------------------------------------------------------
    # Fallback (rule-based) extraction
    # ------------------------------------------------------------------

    def _fallback_extract(self, path_id: str, question: str, answer: str, domain: str) -> ReasoningPathResponse:
        raw_steps = _rule_based_extract(question, answer, domain)

        # Build a linear thought tree (no branching in fallback mode)
        all_nodes: Dict[str, ThoughtNode] = {}
        node_ids = []
        score_acc = 0.0
        for i, s in enumerate(raw_steps):
            nid = _node_id()
            score_acc += s["confidence"]
            node = ThoughtNode(
                node_id=nid,
                step_num=i + 1,
                text=s["text"],
                type=s["type"],
                confidence=s["confidence"],
                path_score=score_acc,
                is_selected=True,
                children=[],
            )
            if node_ids:
                all_nodes[node_ids[-1]].children.append(nid)
            all_nodes[nid] = node
            node_ids.append(nid)

        root_id = node_ids[0] if node_ids else _node_id()
        beams = [{"steps": raw_steps, "score": score_acc}]
        return self._build_response(path_id, beams, all_nodes, root_id)

    # ------------------------------------------------------------------
    # Build final response
    # ------------------------------------------------------------------

    def _build_response(
        self,
        path_id: str,
        beams: List[Dict],
        all_nodes: Dict[str, ThoughtNode],
        root_id: str,
    ) -> ReasoningPathResponse:
        best = max(beams, key=lambda b: b["score"])

        # Mark best-path nodes
        best_path_ids: List[str] = []
        current = root_id
        for step in best["steps"]:
            # find node matching text
            for nid, node in all_nodes.items():
                if node.text == step["text"] and nid not in best_path_ids:
                    all_nodes[nid].is_selected = True
                    best_path_ids.append(nid)
                    break

        steps = [
            ReasoningStep(
                step_num=i + 1,
                text=s["text"],
                type=s.get("type", "inference"),
                confidence=s.get("confidence", 0.7),
            )
            for i, s in enumerate(best["steps"])
        ]

        tree = ThoughtTree(
            root_id=root_id,
            nodes=all_nodes,
            best_path_ids=best_path_ids,
        )

        return ReasoningPathResponse(
            path_id=path_id,
            steps=steps,
            thought_tree=tree,
            metadata={
                "extraction_method": "llm_beam_search" if self._use_llm else "rule_based",
                "beam_size": self.beam_size,
                "score": best["score"],
                "num_paths_explored": len(beams),
                "use_llm": self._use_llm,
            },
        )


# ---------------------------------------------------------------------------
# Module-level singleton (lazy)
# ---------------------------------------------------------------------------
_extractor_instance: Optional[ReasoningPathExtractor] = None

def get_extractor() -> ReasoningPathExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        llm_config = {
            "model": os.environ.get("LLM_MODEL", "gpt-4-turbo"),
            "temperature": 0.3,
            "api_key": os.environ.get("OPENAI_API_KEY", "placeholder-key-for-compilation"),
        }
        _extractor_instance = ReasoningPathExtractor(llm_config=llm_config, beam_size=3)
    return _extractor_instance
