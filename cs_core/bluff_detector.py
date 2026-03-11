"""
cs_core/bluff_detector.py
PathAwareBluffDetector - combines step-level signals with path-level signals.
"""
from typing import Dict, Any, List, Optional
from api.schemas import ReasoningPathResponse


class PathAwareBluffDetector:
    """
    Multi-signal bluff detector that combines:
      1. Step-level bluff scores (from StepValidator)
      2. Path coherence  (beam score - relative measure of how well steps connect)
      3. Concept grounding (semantic similarity to domain KG)
      4. Confidence-accuracy mismatch (LLM confidence vs. actual correctness)
      5. Verbosity vs. substance (answer length / number of steps)
    """

    def detect(
        self,
        reasoning_path: ReasoningPathResponse,
        student_answer: str,
        step_validations: Optional[List[Dict]] = None,
        kg=None,  # DomainKnowledgeGraph instance, optional
    ) -> Dict[str, Any]:

        steps = reasoning_path.steps
        if not steps:
            return {"probability": 0.5, "signals": {}, "explanation": "No steps extracted."}

        # ── Signal 1: Average step-level bluff score ─────────────────────────
        if step_validations:
            step_bluffs = [v.get("bluff_score", 0.0) for v in step_validations]
        else:
            # Fallback: use confidence inversion as proxy
            step_bluffs = [max(0.0, 1.0 - s.confidence) for s in steps]
        avg_step_bluff = sum(step_bluffs) / len(step_bluffs)

        # ── Signal 2: Path coherence (from beam search score) ───────────────
        meta = reasoning_path.metadata or {}
        beam_score = meta.get("score", None)
        # Normalize: beam_score is additive confidence, max possible = max_steps
        max_possible = len(steps)   # each step contributes ~1.0 max
        coherence = min(1.0, (beam_score or 0) / max(max_possible, 1))

        # ── Signal 3: Concept grounding ──────────────────────────────────────
        avg_grounding = 0.6  # default if no KG
        if kg is not None:
            try:
                grounding_scores = []
                for step in steps:
                    results = kg.map_step_to_concept(step.text, top_k=1)
                    grounding_scores.append(results[0]["similarity_score"] if results else 0.0)
                avg_grounding = sum(grounding_scores) / len(grounding_scores)
            except Exception:
                avg_grounding = 0.6

        # ── Signal 4: Confidence-accuracy mismatch ───────────────────────────
        if step_validations:
            mismatches = []
            for sv, step in zip(step_validations, steps):
                is_valid = sv.get("is_valid", True)
                conf = step.confidence
                mismatch = conf * (0 if is_valid else 1)  # high conf + wrong = high mismatch
                mismatches.append(mismatch)
            avg_mismatch = sum(mismatches) / len(mismatches) if mismatches else 0.0
        else:
            avg_mismatch = 0.0

        # ── Signal 5: Verbosity vs. substance ───────────────────────────────
        chars_per_step = len(student_answer) / len(steps)
        # > 200 chars/step with few steps = padding
        verbosity_bluff = min(1.0, max(0.0, (chars_per_step - 200) / 300))

        # ── Combine signals (empirically tuned weights) ──────────────────────
        bluff_prob = (
            avg_step_bluff        * 0.30 +
            (1.0 - coherence)     * 0.25 +
            (1.0 - avg_grounding) * 0.20 +
            avg_mismatch          * 0.15 +
            verbosity_bluff       * 0.10
        )
        bluff_prob = round(min(max(bluff_prob, 0.0), 1.0), 3)

        # ── Explanation ──────────────────────────────────────────────────────
        issues = []
        if avg_step_bluff > 0.5:
            issues.append(f"High step-bluff ({avg_step_bluff:.2f}) — confident language with incorrect steps")
        if coherence < 0.4:
            issues.append(f"Low path coherence ({coherence:.2f}) — steps don't connect well")
        if avg_grounding < 0.4:
            issues.append(f"Weak concept grounding ({avg_grounding:.2f}) — steps reference unknown concepts")
        if avg_mismatch > 0.4:
            issues.append(f"Confidence-accuracy mismatch ({avg_mismatch:.2f}) — confident but incorrect")
        explanation = "; ".join(issues) if issues else "No significant bluffing detected."

        return {
            "probability": bluff_prob,
            "signals": {
                "avg_step_bluff":  round(avg_step_bluff, 3),
                "coherence":       round(coherence, 3),
                "avg_grounding":   round(avg_grounding, 3),
                "conf_acc_mismatch": round(avg_mismatch, 3),
                "verbosity_bluff": round(verbosity_bluff, 3),
            },
            "explanation": explanation,
        }
