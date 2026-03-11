import random
from typing import List, Dict
from fastapi import APIRouter
from .schemas import IEMFMEAResponse, IEMSPCResponse, IEMMSAResponse
from iem_qa.spc import calculate_spc_charts
from iem_qa.fmea import calculate_fmea_rpn
from iem_qa.msa import calculate_cohens_kappa

router = APIRouter(prefix="/api/iem", tags=["IEM Quality Assurance"])

@router.get("/spc", response_model=IEMSPCResponse)
async def get_spc_charts():
    """
    Stage 5 (SPC): Retrieves X-bar and R control charts data.
    Uses dummy subgroups for n=5, k=10 papers for now.
    """
    # Generate 10 subgroups of 5 scores (0-100)
    dummy_evals = [[random.uniform(70, 100) for _ in range(5)] for _ in range(10)]
    return calculate_spc_charts(dummy_evals)

@router.get("/fmea", response_model=List[IEMFMEAResponse])
async def get_fmea_report():
    """
    Stage 5 (FMEA): Retrieves the Risk Priority Number (RPN) report.
    Pulls an aggregation of errors for the dummy data.
    """
    error_types = ["logical_jump", "calculation_error", "missing_step", "hallucinated_variable", "minor_typo"]
    
    # Generate random count of synthetic errors
    dummy_errors = [{"type": random.choice(error_types)} for _ in range(30)]
    return calculate_fmea_rpn(dummy_errors)

@router.get("/msa", response_model=IEMMSAResponse)
async def get_msa_reliability():
    """
    Stage 5 (MSA): Retrieves Cohen's Kappa score for AI vs Human grading.
    """
    # Generate discrete score classes spanning 0-4 for instance (A,B,C,D,F)
    # Give the AI scores a high correlation to the human baseline
    dummy_human_baseline = [random.randint(0, 4) for _ in range(50)]
    dummy_ai_scores = [score if random.random() > 0.15 else random.randint(0, 4) for score in dummy_human_baseline]
    
    return calculate_cohens_kappa(dummy_human_baseline, dummy_ai_scores)
