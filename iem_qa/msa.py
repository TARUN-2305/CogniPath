from typing import List, Dict
from sklearn.metrics import cohen_kappa_score

def calculate_cohens_kappa(human_scores: List[int], ai_scores: List[int]) -> Dict[str, float]:
    """
    Calculates Measurement System Analysis (MSA) reliability using Cohen's Kappa.
    
    Args:
        human_scores: Parallel array of scores graded by humans (baseline)
        ai_scores: Parallel array of scores graded by the AI system.
    
    Returns:
         Dictionary returning the Cohen's Kappa score representing reliability.
    """
    if len(human_scores) != len(ai_scores):
        raise ValueError("Human scores and AI scores lists must be the identical length.")
        
    if not human_scores:
        return {"kappa": 0.0}

    # Using Scikit-Learn as requested by IEM expert to flawlessly handle edge-case probability logic.
    kappa = cohen_kappa_score(human_scores, ai_scores)
    
    return {
        "kappa": round(float(kappa), 4)
    }
