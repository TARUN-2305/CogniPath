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

