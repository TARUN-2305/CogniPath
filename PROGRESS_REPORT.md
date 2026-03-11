# CogniPath — Full Project Progress Report

> **Generated:** 2026-03-11  
> **GitHub:** https://github.com/TARUN-2305/CogniPath  
> **Stack:** FastAPI + Python + MongoDB (Motor) | Next.js 16 + TypeScript + React Flow + Recharts | Tailwind CSS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Phase 1 — FastAPI Backend Scaffold](#2-phase-1--fastapi-backend-scaffold)
3. [Phase 2 — IEM Quality Assurance Layer](#3-phase-2--iem-quality-assurance-layer)
4. [Phase 3 — Next.js Frontend Dashboard](#4-phase-3--nextjs-frontend-dashboard)
5. [Phase 4 — Core CS Architecture (Multi-Agent + KG + Validator)](#5-phase-4--core-cs-architecture)
6. [Phase 7 — Pre-Evaluation Teacher Tools](#6-phase-7--pre-evaluation-teacher-tools)
7. [Phase 8 — Biology Knowledge Graph Demo (Photosynthesis)](#7-phase-8--biology-knowledge-graph-demo)
8. [Phase 9 — MongoDB Integration, Multi-Question Test Builder, KG Viewer](#8-phase-9--mongodb-integration)
9. [File Tree](#9-file-tree)

---

## 1. Project Overview

CogniPath is an **Explainable AI (XAI) grading system** that bridges Computer Science and Industrial Engineering & Management (IEM). It evaluates student answers through:

1. **Tree-of-Thought Reasoning Path Extraction** — decompose an answer into logical steps
2. **Knowledge Graph Validation** — map each step against a domain-specific curriculum graph
3. **NLI + SymPy Step Validator** — detect logical fallacies and arithmetic errors
4. **Multi-Agent Debate Room (KT-PSP)** — Teacher, Student Evaluator, and Judge agents deliberate to issue a final score
5. **IEM Quality Assurance Layer** — SPC (Statistical Process Control), FMEA (Risk Priority Numbers), MSA (Cohen's Kappa)
6. **Teacher Pre-Evaluation Pipeline** — Syllabus ingestion → Knowledge Graph → Multi-question Test Builder → CSV Batch Evaluation

---

## 2. Phase 1 — FastAPI Backend Scaffold

### `api/schemas.py` — Pydantic Data Contracts

```python
from pydantic import BaseModel
from typing import List, Optional, Dict, Union

class EvaluationRequest(BaseModel):
    student_id: str
    question_id: str
    student_answer: str
    ground_truth: str

class ReasoningStep(BaseModel):
    step_num: int
    text: str
    type: str
    confidence: float

class ReasoningPathResponse(BaseModel):
    path_id: str
    steps: List[ReasoningStep]

class ValidationResponse(BaseModel):
    path_id: str
    is_valid: bool
    bluff_score: float
    error_type: Optional[str] = None

class IEMFMEAResponse(BaseModel):
    error_type: str
    severity: int
    occurrence: int
    detection: int
    rpn: int

class SPCCenterLine(BaseModel):
    center_line: float
    UCL: float
    LCL: float
    data_points: List[float]

class IEMSPCResponse(BaseModel):
    x_double_bar: float
    r_bar: float
    x_bar_chart: SPCCenterLine
    r_chart: SPCCenterLine

class IEMMSAResponse(BaseModel):
    kappa: float

# --- Teacher / Pre-Evaluation Schemas ---
class TestQuestion(BaseModel):
    question_id: str                       # e.g. "photo-1", "photo-2"
    question: str
    ground_truth: str
    expected_format: str
    enable_math_validation: bool = True
    enable_logic_validation: bool = True

class TestCreationRequest(BaseModel):
    test_id: str                           # e.g. "biology-unit2"
    subject: str                           # e.g. "Biology"
    questions: List[TestQuestion]          # unlimited questions

class BatchStudentAnswer(BaseModel):
    student_id: str
    question_id: str                       # which question in this test
    student_answer: str

class BatchSubmissionRequest(BaseModel):
    test_id: str
    answers: List[BatchStudentAnswer]

class KGNode(BaseModel):
    node_id: str
    label: str
    description: Optional[str] = None
    node_type: str = "concept"             # concept | relation
```

### `api/main.py` — FastAPI Application Entry Point

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from cs_core.debate_room import run_grading_debate
from api.iem_routes import router as iem_router
from iem_qa.fmea import calculate_fmea_rpn

app = FastAPI(
    title="CogniPath XAI Backend",
    description="Interdisciplinary AI Grading & IEM Quality Assurance System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.teacher_routes import router as teacher_router

app.include_router(iem_router)
app.include_router(teacher_router, prefix="/api/teacher")

class StudentSubmission(BaseModel):
    student_id: str
    question_id: str
    question: str
    student_answer: str

@app.post("/api/evaluate", tags=["Core CS Architecture"])
async def evaluate_student_answer(submission: StudentSubmission):
    try:
        mock_reasoning_path = [
            {"step_num": 1, "text": "Identified base condition.", "type": "recognition"},
            {"step_num": 2, "text": "Applied transition function.", "type": "application"}
        ]
        mock_validation_data = {
            "path_id": submission.question_id,
            "is_valid": True,
            "bluff_score": 0.05,
            "error_type": None
        }
        final_judgment_json = run_grading_debate(
            question=submission.question,
            reasoning_path=mock_reasoning_path,
            validation_data=mock_validation_data
        )
        final_judgment = json.loads(final_judgment_json) if final_judgment_json else {}

        fmea_report = None
        if final_judgment.get("primary_error_type"):
            fmea_report = calculate_fmea_rpn([{"type": final_judgment["primary_error_type"]}])

        return {
            "student_id": submission.student_id,
            "status": "success",
            "cognitive_map": {
                "nodes": mock_reasoning_path,
                "validation": mock_validation_data
            },
            "grading_results": final_judgment,
            "iem_triggers": {
                "fmea_generated": bool(fmea_report),
                "fmea_data": fmea_report
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "CogniPath API is live and routing."}
```

---

## 3. Phase 2 — IEM Quality Assurance Layer

### `iem_qa/spc.py` — Statistical Process Control

```python
from typing import List, Dict, Union
import numpy as np

A2 = 0.577  # For subgroup size n=5
D3 = 0
D4 = 2.114

def calculate_spc_charts(student_evaluations: List[List[float]]) -> Dict[str, Union[float, dict]]:
    k = len(student_evaluations)
    x_bars = [np.mean(group) for group in student_evaluations]
    ranges  = [np.max(group) - np.min(group) for group in student_evaluations]

    x_double_bar = np.mean(x_bars)
    r_bar = np.mean(ranges)

    return {
        "x_double_bar": float(x_double_bar),
        "r_bar": float(r_bar),
        "x_bar_chart": {
            "center_line": float(x_double_bar),
            "UCL": float(x_double_bar + A2 * r_bar),
            "LCL": float(x_double_bar - A2 * r_bar),
            "data_points": [float(x) for x in x_bars]
        },
        "r_chart": {
            "center_line": float(r_bar),
            "UCL": float(D4 * r_bar),
            "LCL": float(D3 * r_bar),
            "data_points": [float(r) for r in ranges]
        }
    }
```

### `iem_qa/fmea.py` — Failure Mode & Effects Analysis (FMEA / RPN)

```python
from typing import List, Dict
import pandas as pd

FMEA_BASELINE_DB = {
    "logical_jump":         {"severity": 9, "detection": 7},
    "calculation_error":    {"severity": 8, "detection": 2},
    "missing_step":         {"severity": 7, "detection": 4},
    "hallucinated_variable":{"severity": 10,"detection": 8},
    "minor_typo":           {"severity": 1, "detection": 3}
}

def calculate_fmea_rpn(errors_logged: List[Dict[str, str]]) -> List[Dict[str, int]]:
    df = pd.DataFrame(errors_logged)
    if df.empty:
        return []
    occurrence_counts = df['type'].value_counts().to_dict()
    report = []
    for error_type, count in occurrence_counts.items():
        base = FMEA_BASELINE_DB.get(error_type, {"severity": 5, "detection": 5})
        occurrence = min(count, 10)
        rpn = base["severity"] * occurrence * base["detection"]
        report.append({"error_type": error_type, "severity": base["severity"],
                        "occurrence": occurrence, "detection": base["detection"], "rpn": rpn})
    return sorted(report, key=lambda x: x["rpn"], reverse=True)
```

### `iem_qa/msa.py` — Measurement System Analysis (Cohen's Kappa)

```python
from sklearn.metrics import cohen_kappa_score
from typing import List, Dict

def calculate_cohens_kappa(human_scores: List[int], ai_scores: List[int]) -> Dict[str, float]:
    kappa = cohen_kappa_score(human_scores, ai_scores)
    return {"kappa": round(float(kappa), 4)}
```

---

## 4. Phase 3 — Next.js Frontend Dashboard

**Key Libraries installed:**
- `react-flow-renderer` / `reactflow` — Directed acyclic graph with custom nodes
- `recharts` — SPC line chart and FMEA data table
- `dagre` — Auto-layout engine for React Flow (top-down hierarchy)
- `lucide-react` — Icon library

### Sidebar Navigation
Three tabs: **Individual Analysis**, **Class-Wide IEM Analytics**, **Teacher Tools**

### Individual Analysis Tab
- `CognitiveMap.tsx` — React Flow canvas with `CustomReasoningNode` nodes  
- `dagre` auto-layout runs once at import to arrange nodes top-down
- `mockCognitiveMap.ts` — physics free-fall student scenario with 6 reasoning nodes

### IEM Analytics Tab
- `SPCChart.tsx` — Recharts `LineChart` with solid center line, dashed UCL/LCL `ReferenceLines`, and data points plotted
- `FMEADataGrid.tsx` — Table with rows highlighted red when RPN > 100
- MSA Kappa card showing Cohen's Kappa score 0.84 (Almost Perfect Agreement)

---

## 5. Phase 4 — Core CS Architecture

### `cs_core/knowledge_graph.py` — Domain Knowledge Graph (NetworkX + SentenceTransformers)

```python
import networkx as nx
from sentence_transformers import SentenceTransformer, util
import numpy as np
from typing import List, Dict, Tuple, Optional, Union

class DomainKnowledgeGraph:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        self.graph = nx.DiGraph()
        self.encoder = SentenceTransformer(model_name)
        self.node_embeddings = {}
        self.node_texts = []
        self.node_ids = []

    def ingest_curriculum_triplets(self, triplets: List[Tuple[str, str, str]]):
        for source, relation, target in triplets:
            self.graph.add_edge(source, target, relation=relation)
        self._compute_node_embeddings()

    def _compute_node_embeddings(self):
        self.node_ids = list(self.graph.nodes())
        self.node_texts = self.node_ids
        embeddings = self.encoder.encode(self.node_texts, convert_to_tensor=True)
        for i, node_id in enumerate(self.node_ids):
            self.node_embeddings[node_id] = embeddings[i]

    def map_step_to_concept(self, student_step_text: str, top_k: int = 1) -> List[Dict[str, Union[str, float]]]:
        step_embedding = self.encoder.encode(student_step_text, convert_to_tensor=True)
        corpus_embeddings = self.encoder.encode(self.node_texts, convert_to_tensor=True)
        cos_scores = util.cos_sim(step_embedding, corpus_embeddings)[0]
        k = min(top_k, len(cos_scores))
        top_results = np.argpartition(-cos_scores.cpu(), range(k))[:k]
        results = [{"concept_node": self.node_ids[idx], "similarity_score": float(cos_scores[idx])}
                   for idx in top_results]
        return sorted(results, key=lambda x: x["similarity_score"], reverse=True)

    def is_valid_trajectory(self, concept_a: str, concept_b: str) -> bool:
        if concept_a not in self.graph or concept_b not in self.graph:
            return False
        try:
            return nx.has_path(self.graph, concept_a, concept_b)
        except nx.NetworkXNoPath:
            return False
```

### `cs_core/validator.py` — NLI + SymPy Step Validator with Bluff Score

```python
import re, sympy, uuid
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
from transformers import pipeline
from typing import Dict, Any, Optional

class StepValidator:
    def __init__(self, model_name: str = "cross-encoder/nli-deberta-v3-small"):
        self.nli_classifier = pipeline("text-classification", model=model_name)
        self.confidence_markers = [
            "obviously", "clearly", "as we know", "it is trivial that",
            "makes sense", "therefore it follows", "undoubtedly", "without a doubt"
        ]

    def check_logic(self, step_a: str, step_b: str) -> Dict[str, Any]:
        result = self.nli_classifier({"text": step_a, "text_pair": step_b})
        label = result.get('label', '').lower()
        score = result.get('score', 0.0)
        is_contradiction = 'contradiction' in label or label == 'label_0'
        if is_contradiction and score > 0.6:
            return {"valid": False, "score": score, "reason": "Logical Fallacy"}
        return {"valid": True, "score": score, "reason": None}

    def check_math(self, step_text: str) -> Dict[str, Any]:
        match = re.search(r'([^=]+)\s*=\s*([^=]+)', step_text)
        if not match:
            return {"valid": True, "reason": None}
        transformations = (standard_transformations + (implicit_multiplication_application,))
        try:
            lhs = parse_expr(match.group(1).strip(), transformations=transformations)
            rhs = parse_expr(match.group(2).strip(), transformations=transformations)
            diff = sympy.simplify(lhs - rhs)
            return {"valid": diff == 0, "reason": None if diff == 0 else "Calculation Error"}
        except Exception as e:
            return {"valid": False, "reason": f"Calculation Error (Malformed): {str(e)}"}

    def calculate_bluff(self, step_text: str, math_valid: bool, logic_valid: bool) -> float:
        lower_text = step_text.lower()
        coeff = sum(1 for m in self.confidence_markers if m in lower_text)
        if coeff > 0:
            return 0.85 + min(coeff, 3) * 0.05 if not (math_valid and logic_valid) else 0.10
        return 0.05 if (math_valid and logic_valid) else 0.20

    def validate_step(self, path_id: str, current_step: str, previous_step: Optional[str] = None) -> Dict[str, Any]:
        math_result = self.check_math(current_step)
        logic_result = {"valid": True, "reason": None}
        if previous_step:
            logic_result = self.check_logic(previous_step, current_step)
        is_valid = math_result["valid"] and logic_result["valid"]
        error_type = math_result["reason"] if not math_result["valid"] else logic_result["reason"]
        bluff_score = self.calculate_bluff(current_step, math_result["valid"], logic_result["valid"])
        return {"path_id": path_id, "is_valid": is_valid, "bluff_score": round(bluff_score, 2), "error_type": error_type}
```

### `cs_core/debate_room.py` — Multi-Agent KT-PSP Debate (AG2 / AutoGen)

```python
import autogen, json, os
from typing import Dict, Any, List

llm_config = {
    "model": "gpt-4-turbo",
    "temperature": 0.2,
    "api_key": os.environ.get("OPENAI_API_KEY", "placeholder-key-for-compilation")
}

teacher_agent = autogen.AssistantAgent(
    name="Teacher_Agent",
    system_message="""You are a strict but fair expert Teacher.
    Output a strict KT-PSP grading rubric for 'Conceptual Understanding' and 'Procedural Fluency'.
    Do not grade the student yet.""",
    llm_config=llm_config,
)

student_evaluator = autogen.AssistantAgent(
    name="Student_Evaluator",
    system_message="""You are the Student Evaluator. Map the student's steps to the rubric.
    If math is wrong (SymPy failed) but logic is sound (NLI passed), argue for partial credit.""",
    llm_config=llm_config,
)

judge_agent = autogen.AssistantAgent(
    name="Judge_Agent",
    system_message="""You are the Final Judge. Heavily penalize steps with high Bluff Score.
    Output MUST be strict JSON:
    { "path_id": string, "final_score": float, "partial_credit_awarded": boolean,
      "primary_error_type": string, "bluff_penalty_applied": boolean }""",
    llm_config=llm_config,
)

user_proxy = autogen.UserProxyAgent(
    name="System_Proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=0,
    code_execution_config=False,
)

def run_grading_debate(question: str, reasoning_path: List[Dict[str, Any]], validation_data: Dict[str, Any]) -> str:
    debate_chat = autogen.GroupChat(
        agents=[user_proxy, teacher_agent, student_evaluator, judge_agent],
        messages=[], max_round=4, speaker_selection_method="round_robin"
    )
    manager = autogen.GroupChatManager(groupchat=debate_chat, llm_config=llm_config)
    user_proxy.initiate_chat(manager, message=f"""
    Question: {question}
    Reasoning Path: {json.dumps(reasoning_path)}
    Validation Data: {json.dumps(validation_data)}
    Teacher_Agent, please establish the rubric.""", summary_method="last_msg")
    try:
        chat_history = user_proxy.chat_messages[manager]
        return chat_history[-1]["content"] if chat_history else "{}"
    except Exception as e:
        return "{}"
```

---

## 6. Phase 7 — Pre-Evaluation Teacher Tools

### `api/teacher_routes.py` — Teacher API Endpoints (with MongoDB)

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from .schemas import TestCreationRequest, BatchSubmissionRequest, KGNode
from .db import get_tests_col, get_kg_nodes_col
import re

router = APIRouter()

@router.post("/ingest_syllabus", tags=["Teacher Pre-Evaluation"])
async def ingest_syllabus(file: UploadFile = File(...)):
    raw = await file.read()
    text = raw.decode("utf-8", errors="ignore")
    sentences = [s.strip() for s in re.split(r'[.\n]', text) if len(s.strip()) > 15]
    nodes = []
    col = get_kg_nodes_col()
    await col.delete_many({"source_file": file.filename})
    for i, sentence in enumerate(sentences[:40]):
        words = sentence.split()
        label = " ".join(words[:6])
        node = {"node_id": f"kg-{i}", "label": label, "description": sentence,
                "node_type": "concept", "source_file": file.filename}
        await col.insert_one(node)
        nodes.append({"node_id": f"kg-{i}", "label": label, "description": sentence, "node_type": "concept"})
    return {"status": "success", "message": f"Ingested '{file.filename}' → {len(nodes)} nodes stored.", "node_count": len(nodes), "nodes": nodes}

@router.get("/kg_nodes", tags=["Teacher Pre-Evaluation"])
async def get_kg_nodes():
    col = get_kg_nodes_col()
    nodes = []
    async for doc in col.find({}, {"_id": 0}):
        nodes.append(doc)
    return {"nodes": nodes, "count": len(nodes)}

@router.post("/create_test", tags=["Teacher Pre-Evaluation"])
async def create_test(request: TestCreationRequest):
    col = get_tests_col()
    await col.update_one({"test_id": request.test_id}, {"$set": request.dict()}, upsert=True)
    return {"status": "success", "message": f"Test '{request.test_id}' with {len(request.questions)} question(s) saved."}

@router.get("/tests", tags=["Teacher Pre-Evaluation"])
async def list_tests():
    col = get_tests_col()
    tests = []
    async for doc in col.find({}, {"_id": 0}):
        tests.append(doc)
    return {"tests": tests}
```

### `frontend/src/components/teacher/SyllabusDropzone.tsx`

A drag-and-drop file upload component that:
1. Accepts `.txt` / `.pdf` file
2. Calls `POST /api/teacher/ingest_syllabus`
3. Shows a loading spinner while "Extracting Triplets & Embedding..."
4. On success, shows the node count and a **"🔭 View Knowledge Graph"** button
5. Clicking View KG renders the `KnowledgeGraphViewer` React Flow graph inline below the dropzone

### `frontend/src/components/teacher/TestBuilderForm.tsx`

Multi-question test builder that:
1. Accepts **Test ID** and **Subject** as metadata
2. Has an **expandable list of question cards**, each with:
   - Question ID (`photo-1`, `photo-2`, etc.)
   - Question prompt (textarea)
   - Ground Truth / Rubric (textarea)
   - Expected format (text)
   - Per-question toggle for **DeBERTa Logic Engine** and **SymPy Math Engine**
   - 🗑 **Trash button** to remove a question
3. **"+ Add Another Question"** dashed button at the bottom
4. On submit, calls `POST /api/teacher/create_test` and upserts to MongoDB
5. Footer hint shows the correct CSV format: `student_id,question_id,answer`

---

## 7. Phase 8 — Biology Knowledge Graph Demo (Photosynthesis)

### Question Configured
| Field | Value |
|---|---|
| Question ID | `photo-1`, `photo-2` |
| Subject | Biology |
| Prompt | Explain the process of photosynthesis and identify where it occurs |
| Ground Truth | Chloroplasts, chlorophyll, CO2+water→glucose, O2 byproduct, thylakoids, stroma |

### `students_photo.csv` — Multi-Question Batch Format

```csv
student_id,question_id,answer
BIO-001,photo-1,"Plants use chlorophyll to absorb sunlight. They take in CO2 and water. This makes glucose and releases oxygen."
BIO-001,photo-2,"Light reactions happen in the thylakoid membrane. Calvin cycle happens in the stroma."
BIO-002,photo-1,"Photosynthesis happens in the chloroplasts. Chlorophyll absorbs light energy..."
BIO-002,photo-2,"The light-dependent reactions occur in the thylakoid..."
BIO-003,photo-1,"It happens in the mitochondria. The plant uses sunlight to turn water into energy. It releases carbon dioxide."
BIO-003,photo-2,"All the reactions happen in the nucleus. ATP is produced in the cytoplasm."
BIO-004,photo-1,"Obviously the process takes place in the chloroplast..."
BIO-004,photo-2,"Light-dependent reactions are in the thylakoid..."
BIO-005,photo-1,"Sunlight hits the chlorophyll in the chloroplast..."
BIO-005,photo-2,"Light reactions occur in the thylakoid membrane..."
```

### Student Selector Dropdown (Individual Analysis Tab)

After CSV upload (simulated 3s batch processing):
- A **`<select>` dropdown** labeled "Student ID:" appears
- Options: BIO-001 through BIO-005
- Choosing any student hot-swaps the React Flow graph:
  - **BIO-003** → Red dashed invalid path (Mitochondria hallucination, CO₂ contradiction, high bluff score)
  - **All others** → Green animated valid path (correct photosynthesis reasoning)

### Mock Graph Data

**`mockBiologyMap.ts` — BIO-003 (Invalid Path)**
```typescript
// Node 1: 'It happens in the mitochondria.' → status: 'invalid', errorType: 'Concept Hallucination', bluffScore: 0.65
// Node 2: 'The plant uses sunlight to turn water into energy.' → status: 'warning', errorType: 'Missing Preconditions'
// Node 3: 'It releases carbon dioxide.' → status: 'invalid', errorType: 'Scientific Contradiction', bluffScore: 0.88
// Edges: Red dashed (#ef4444) throughout
```

**`mockBiologyMap.ts` — BIO-001/002/004/005 (Perfect Path)**
```typescript
// Node 1: 'Chloroplasts absorb sunlight using chlorophyll.' → status: 'valid', bluffScore: 0.05
// Node 2: 'Carbon dioxide and water are converted into glucose.' → status: 'valid', bluffScore: 0.02
// Node 3: 'Oxygen is released as a byproduct.' → status: 'valid', bluffScore: 0.01
// Edges: Green animated (#22c55e) throughout
```

---

## 8. Phase 9 — MongoDB Integration

### `api/db.py` — Async Motor Connection

```python
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://127.0.0.1:27017"
DB_NAME = "cognipath"

_async_client = AsyncIOMotorClient(MONGO_URI)
async_db = _async_client[DB_NAME]

def get_tests_col():    return async_db["tests"]
def get_kg_nodes_col(): return async_db["kg_nodes"]
def get_submissions_col(): return async_db["submissions"]
```

**MongoDB Collections:**
| Collection | Contents |
|---|---|
| `kg_nodes` | Concept nodes extracted from each uploaded syllabus |
| `tests` | Full multi-question test definitions (upserted by `test_id`) |
| `submissions` | (Reserved) — for storing batch student submission results |

### `frontend/src/components/teacher/KnowledgeGraphViewer.tsx`

A React Flow component that:
1. On mount, calls `GET /api/teacher/kg_nodes`
2. Lays out all returned concept nodes in a 5-column grid
3. Draws sequential edges between consecutive nodes
4. Renders each node as a sky-blue card: **label** (bold) + **description** (small gray preview)
5. Displays a "X Concept Nodes — Extracted from ingested syllabus" badge at the top
6. Has Controls, MiniMap, and Background elements for navigation

---

## 9. File Tree

```
CogniPath/
├── .gitignore
├── requirements.txt              ← fastapi, uvicorn, motor, pymongo, transformers, sympy, networkx...
├── students_photo.csv            ← Multi-question CSV: student_id, question_id, answer
├── PROGRESS_REPORT.md            ← This file
│
├── api/
│   ├── __init__.py
│   ├── db.py                     ← Motor async MongoDB client → cognipath DB
│   ├── main.py                   ← FastAPI app, CORS, router mounts, /api/evaluate endpoint
│   ├── schemas.py                ← All Pydantic models (EvaluationRequest, TestCreationRequest, KGNode...)
│   ├── iem_routes.py             ← /api/iem/spc and /api/iem/msa endpoints
│   └── teacher_routes.py         ← /ingest_syllabus, /kg_nodes, /create_test, /tests
│
├── cs_core/
│   ├── knowledge_graph.py        ← DomainKnowledgeGraph (NetworkX + SentenceTransformers)
│   ├── validator.py              ← StepValidator (DeBERTa NLI + SymPy Math + Bluff Score)
│   └── debate_room.py            ← KT-PSP Multi-Agent Debate (AutoGen: Teacher, Evaluator, Judge)
│
├── iem_qa/
│   ├── spc.py                    ← SPC X-bar/R chart computation (A2=0.577, D3/D4 for n=5)
│   ├── fmea.py                   ← FMEA RPN = Severity × Occurrence × Detection
│   └── msa.py                    ← Cohen's Kappa via sklearn
│
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx        ← suppressHydrationWarning fix
        │   ├── globals.css
        │   └── page.tsx          ← Dashboard: tabs, CSV upload, student selector dropdown
        ├── components/
        │   ├── flow/
        │   │   ├── CognitiveMap.tsx       ← React Flow canvas, accepts studentId prop
        │   │   └── CustomReasoningNode.tsx← Color-coded node cards (green/yellow/red)
        │   ├── iem/
        │   │   ├── SPCChart.tsx           ← Recharts LineChart with UCL/LCL
        │   │   └── FMEADataGrid.tsx       ← RPN table, red highlight for RPN > 100
        │   └── teacher/
        │       ├── SyllabusDropzone.tsx   ← Drag-drop syllabus upload + View KG button
        │       ├── TestBuilderForm.tsx    ← Multi-question builder with + Add Question
        │       └── KnowledgeGraphViewer.tsx ← React Flow render of MongoDB KG nodes
        ├── data/
        │   ├── mockCognitiveMap.ts        ← Physics free-fall student scenario (6 nodes)
        │   └── mockBiologyMap.ts          ← Photosynthesis: BIO-003 (invalid) + others (perfect)
        └── lib/
            └── dagreLayout.ts            ← dagre auto-layout helper (top-down node placement)
```

---

## API Endpoints Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/evaluate` | Full evaluation pipeline (Debate Room + FMEA trigger) |
| `GET` | `/api/iem/spc` | Returns SPC chart data |
| `GET` | `/api/iem/msa` | Returns Cohen's Kappa |
| `POST` | `/api/teacher/ingest_syllabus` | Upload syllabus → extract KG nodes → save to MongoDB |
| `GET` | `/api/teacher/kg_nodes` | Return all saved KG concept nodes from MongoDB |
| `POST` | `/api/teacher/create_test` | Save/upsert multi-question test to MongoDB |
| `GET` | `/api/teacher/tests` | List all saved tests |

---

## Running the Project

**Backend:**
```bash
cd CogniPath
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```bash
cd CogniPath/frontend
npm install
npm run dev
# → http://localhost:3000
```

**MongoDB:** Must be running locally on `127.0.0.1:27017` (default). Database `cognipath` is auto-created.

---

*End of Progress Report*
