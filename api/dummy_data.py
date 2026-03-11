import uuid
import random
from .schemas import EvaluationRequest, ReasoningPathResponse, ReasoningStep, ValidationResponse, IEMFMEAResponse

def generate_dummy_reasoning_path(request: EvaluationRequest) -> ReasoningPathResponse:
    path_id = str(uuid.uuid4())
    steps = [
        ReasoningStep(
            step_num=1,
            text=f"Analyzed the question based on ground truth: {request.ground_truth[:10]}...",
            type="recognition",
            confidence=round(random.uniform(0.8, 1.0), 2)
        ),
        ReasoningStep(
            step_num=2,
            text="Applied relevant formula conceptually.",
            type="application",
            confidence=round(random.uniform(0.7, 0.95), 2)
        ),
        ReasoningStep(
            step_num=3,
            text=f"Calculated final output matching {request.student_answer[:10]}...",
            type="calculation",
            confidence=round(random.uniform(0.6, 0.9), 2)
        )
    ]
    return ReasoningPathResponse(path_id=path_id, steps=steps)

def generate_dummy_validation(path_id: str) -> ValidationResponse:
    is_valid = random.choice([True, False])
    bluff_score = round(random.uniform(0.0, 1.0), 2)
    error_type = "calculation_error" if not is_valid else None
    
    return ValidationResponse(
        path_id=path_id,
        is_valid=is_valid,
        bluff_score=bluff_score,
        error_type=error_type
    )
