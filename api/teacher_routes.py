from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from .schemas import TestCreationRequest, BatchSubmissionRequest, KGNode
from .db import get_tests_col, get_kg_nodes_col
import re

router = APIRouter()

# ---------------------------------------------------------------------------
# POST /api/teacher/ingest_syllabus
# ---------------------------------------------------------------------------
@router.post("/ingest_syllabus", tags=["Teacher Pre-Evaluation"])
async def ingest_syllabus(file: UploadFile = File(...)):
    """
    Accepts a syllabus text/PDF payload, extracts entity-relation triplets,
    stores them as KG nodes in MongoDB, and returns the node list.
    """
    try:
        raw = await file.read()
        text = raw.decode("utf-8", errors="ignore")

        # --- Lightweight IE pipeline (production: replace with LLM extraction) ---
        # Split into sentences and treat each as a candidate concept node.
        sentences = [s.strip() for s in re.split(r'[.\n]', text) if len(s.strip()) > 15]

        nodes = []
        col = get_kg_nodes_col()

        # Clear old KG for this syllabus (fresh ingest)
        await col.delete_many({"source_file": file.filename})

        for i, sentence in enumerate(sentences[:40]):  # cap at 40 nodes for UI clarity
            # Heuristic: extract first 6 words as label
            words = sentence.split()
            label = " ".join(words[:6])
            node = {
                "node_id": f"kg-{i}",
                "label": label,
                "description": sentence,
                "node_type": "concept",
                "source_file": file.filename,
            }
            await col.insert_one(node)
            nodes.append({"node_id": f"kg-{i}", "label": label, "description": sentence, "node_type": "concept"})

        return {
            "status": "success",
            "message": f"Ingested '{file.filename}' → {len(nodes)} concept nodes stored in MongoDB.",
            "node_count": len(nodes),
            "nodes": nodes,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/teacher/kg_nodes
# ---------------------------------------------------------------------------
@router.get("/kg_nodes", tags=["Teacher Pre-Evaluation"])
async def get_kg_nodes():
    """Returns all KG nodes stored in MongoDB for visualization."""
    col = get_kg_nodes_col()
    nodes = []
    async for doc in col.find({}, {"_id": 0}):
        nodes.append(doc)
    return {"nodes": nodes, "count": len(nodes)}


# ---------------------------------------------------------------------------
# POST /api/teacher/create_test
# ---------------------------------------------------------------------------
@router.post("/create_test", tags=["Teacher Pre-Evaluation"])
async def create_test(request: TestCreationRequest):
    """
    Persists a multi-question test to the MongoDB `tests` collection.
    """
    try:
        col = get_tests_col()

        # Upsert (update if test_id already exists)
        await col.update_one(
            {"test_id": request.test_id},
            {"$set": request.dict()},
            upsert=True,
        )

        return {
            "status": "success",
            "message": f"Test '{request.test_id}' with {len(request.questions)} question(s) saved.",
            "test_id": request.test_id,
            "question_count": len(request.questions),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# GET /api/teacher/tests
# ---------------------------------------------------------------------------
@router.get("/tests", tags=["Teacher Pre-Evaluation"])
async def list_tests():
    """Returns all saved tests."""
    col = get_tests_col()
    tests = []
    async for doc in col.find({}, {"_id": 0}):
        tests.append(doc)
    return {"tests": tests}
