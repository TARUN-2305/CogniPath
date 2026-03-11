from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

# --- Import CS Core Modules ---
# Assuming you have these wrapper functions in your cs_core modules
from cs_core.debate_room import run_grading_debate
# from cs_core.extractor import extract_reasoning_path
# from cs_core.validator import StepValidator

# --- Import IEM Modules ---
from api.iem_routes import router as iem_router
from iem_qa.fmea import calculate_fmea_rpn

# --- Initialize FastAPI ---
app = FastAPI(
    title="CogniPath XAI Backend",
    description="Interdisciplinary AI Grading & IEM Quality Assurance System",
    version="1.0.0"
)

# --- CORS Configuration for Next.js ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"], # Added * for easy dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.teacher_routes import router as teacher_router

# --- Mount IEM Analytics Routes ---
# This includes your /api/iem/spc and /api/iem/msa endpoints
app.include_router(iem_router)
app.include_router(teacher_router, prefix="/api/teacher")

# --- Define Pydantic Input Schema ---
class StudentSubmission(BaseModel):
    student_id: str
    question_id: str
    question: str
    student_answer: str

# --- Master Evaluation Endpoint ---
@app.post("/api/evaluate", tags=["Core CS Architecture"])
async def evaluate_student_answer(submission: StudentSubmission):
    try:
        # STEP 1: Extract Reasoning (Tree of Thought)
        # reasoning_path = extract_reasoning_path(submission.question, submission.student_answer)
        
        # NOTE: Using mock data here for the structural template
        mock_reasoning_path = [
            {"step_num": 1, "text": "Identified base condition.", "type": "recognition"},
            {"step_num": 2, "text": "Applied transition function.", "type": "application"}
        ]
        
        # STEP 2: Validate Steps (NLI & SymPy)
        # validator = StepValidator()
        # validation_data = validator.validate_path(mock_reasoning_path)
        
        mock_validation_data = {
            "path_id": submission.question_id,
            "is_valid": True,
            "bluff_score": 0.05,
            "error_type": None
        }

        # STEP 3: Multi-Agent Debate (KT-PSP)
        final_judgment_json = run_grading_debate(
            question=submission.question,
            reasoning_path=mock_reasoning_path,
            validation_data=mock_validation_data
        )
        
        final_judgment = json.loads(final_judgment_json) if final_judgment_json else {}

        # STEP 4: Trigger IEM FMEA if an error was detected
        fmea_report = None
        if final_judgment.get("primary_error_type"):
            fmea_report = calculate_fmea_rpn([{"type": final_judgment["primary_error_type"]}])

        # STEP 5: Construct the combined payload for the React Flow & Recharts UI
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

# Health Check Endpoint
@app.get("/")
async def root():
    return {"message": "CogniPath API is live and routing."}
