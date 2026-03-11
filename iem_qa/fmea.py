from typing import List, Dict
import pandas as pd

def calculate_fmea_rpn(errors_logged: List[Dict[str, str]]) -> List[Dict[str, int]]:
    """
    Calculates Failure Mode and Effects Analysis (FMEA) logic based on logged AI errors.
    
    Args:
        errors_logged: List of dictionaries representing errors caught by the Knowledge Graph/Validator.
                       e.g. [{'type': 'logical_jump'}, {'type': 'calculation_error'}]
    
    Returns:
        A list of JSON compatible dictionaries mapping error types to Severity, Occurrence, Detection, and RPN.
    """
    
    # 1. We hardcode our baseline evaluation mapping for standard error types
    # Severity (1-10): 10 = fundamental collapse, 1 = minor typo
    # Occurrence (1-10): 10 = almost every paper, 1 = extremely rare
    # Detection (1-10): Note inverted logic! 10 = impossible to detect, 1 = easy to catch
    FMEA_BASELINE_DB = {
        "logical_jump": {"severity": 9, "detection": 7}, # Hard to detect by basic LLM
        "calculation_error": {"severity": 8, "detection": 2}, # SymPy detects calculation errors easily
        "missing_step": {"severity": 7, "detection": 4},
        "hallucinated_variable": {"severity": 10, "detection": 8},
        "minor_typo": {"severity": 1, "detection": 3}
    }

    # 2. Count Occurrences dynamically from the AI logs
    # Assume 1 occurrence in log = 1 step on the 1-10 scale (simplification for dummy logic)
    # In production, this would scale based on total frequency distribution.
    df = pd.DataFrame(errors_logged)
    if df.empty:
         return []
         
    occurrence_counts = df['type'].value_counts().to_dict()
    
    fmea_report = []
    
    # 3. Compute RPN
    for error_type, count in occurrence_counts.items():
        baseline = FMEA_BASELINE_DB.get(error_type, {"severity": 5, "detection": 5}) # fallback Default
        
        severity = baseline["severity"]
        detection = baseline["detection"]
        
        # Scale occurrence. Cap at 10.
        occurrence = min(count, 10) 
        
        rpn = severity * occurrence * detection
        
        fmea_report.append({
            "error_type": error_type,
            "severity": severity,
            "occurrence": occurrence,
            "detection": detection,
            "rpn": rpn
        })
        
    # Sort FMEA report descending by highest risk (RPN)
    fmea_report = sorted(fmea_report, key=lambda x: x["rpn"], reverse=True)
    
    return fmea_report
