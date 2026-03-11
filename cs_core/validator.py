import re
import sympy
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
from transformers import pipeline
import uuid
from typing import Dict, Any, Optional

class StepValidator:
    def __init__(self, model_name: str = "cross-encoder/nli-deberta-v3-small"):
        """
        Initializes the Validator module with the Hugging Face DeBERTa NLI pipeline.
        """
        print(f"Loading NLI Model: {model_name}...")
        # Cross-encoders expect a pair of strings and output classification
        # For NLI: Contradiction, Entailment, Neutral (labels vary by model, usually 0=Contradiction, 1=Entailment, 2=Neutral)
        self.nli_classifier = pipeline("text-classification", model=model_name)
        
        self.confidence_markers = [
            "obviously", "clearly", "as we know", "it is trivial that", 
            "makes sense", "therefore it follows", "undoubtedly", "without a doubt"
        ]

    def check_logic(self, step_a: str, step_b: str) -> Dict[str, Any]:
        """
        NLI Engine: Feeds [Step N] as Premise and [Step N+1] as Hypothesis.
        Returns contradiction scores.
        """
        result = self.nli_classifier({"text": step_a, "text_pair": step_b})
        # Note: label mapping depends exactly on the chosen model checkpoint.
        # Assuming typical DeBERTa NLI mapping where 'LABEL_0' might be Contradiction
        # We'll just look for predicting 'Contradiction' or similar label.
        
        # In a real environment, you'd inspect the model's id2label:
        label = result.get('label', '').lower()
        score = result.get('score', 0.0)
        
        is_contradiction = 'contradiction' in label or label == 'label_0'
        
        if is_contradiction and score > 0.6:
            return {"valid": False, "score": score, "reason": "Logical Fallacy"}
            
        return {"valid": True, "score": score, "reason": None}

    def check_math(self, step_text: str) -> Dict[str, Any]:
        """
        SymPy Math Engine: Extracts equations and verifies equality.
        """
        # Simplistic regex to extract anything resembling an equation (e.g., v = sqrt(196) = 14)
        equation_match = re.search(r'([^=]+)\s*=\s*([^=]+)', step_text)
        
        if not equation_match:
            # No math found, trivially valid mathematically
            return {"valid": True, "reason": None}
            
        left_side = equation_match.group(1).split()[-1] # Try to get variable
        left_side = equation_match.group(1).strip()
        right_side = equation_match.group(2).strip()
        
        transformations = (standard_transformations + (implicit_multiplication_application,))
        
        try:
            # Parse both sides
            lhs = parse_expr(left_side, transformations=transformations)
            rhs = parse_expr(right_side, transformations=transformations)
            
            # Check if lhs - rhs == 0
            diff = sympy.simplify(lhs - rhs)
            is_correct = diff == 0
            
            if is_correct:
                return {"valid": True, "reason": None}
            else:
                return {"valid": False, "reason": "Calculation Error"}
                
        except Exception as e:
            # If SymPy fails to parse it, it's malformed math or just text that looked like math
            # We flag it as potential error or ignore depending on strictness.
            return {"valid": False, "reason": f"Calculation Error (Malformed): {str(e)}"}

    def calculate_bluff(self, step_text: str, math_valid: bool, logic_valid: bool) -> float:
        """
        Calculates a bluff score based on confidence markers and actual validity.
        """
        lower_text = step_text.lower()
        
        # Raw confidence coefficient
        confidence_coefficient = 0
        for marker in self.confidence_markers:
            if marker in lower_text:
                confidence_coefficient += 1
                
        base_bluff = 0.05
        
        if confidence_coefficient > 0:
            if not math_valid or not logic_valid:
                # High confidence but wrong math or logic! The Trap!
                return 0.85 + (min(confidence_coefficient, 3) * 0.05) # Caps around 1.0
            else:
                # Confident and correct
                return 0.10
                
        # Not confident, but might still be wrong
        if not math_valid or not logic_valid:
             return 0.20 # Honest mistake
             
        return base_bluff

    def validate_step(self, path_id: str, current_step: str, previous_step: Optional[str] = None) -> Dict[str, Any]:
        """
        Full orchestration of the validation sequence. Returns the exact JSON schema.
        """
        # 1. Math Check (Deterministic)
        math_result = self.check_math(current_step)
        
        # 2. Logic Check (NLI) - Only if there's a previous step
        logic_result = {"valid": True, "reason": None}
        if previous_step:
            logic_result = self.check_logic(previous_step, current_step)
            
        math_valid = math_result["valid"]
        logic_valid = logic_result["valid"]
        
        # Determine overall validity and error type
        is_valid = math_valid and logic_valid
        error_type = math_result["reason"] if not math_valid else logic_result["reason"]
        
        # 3. Bluff Score
        bluff_score = self.calculate_bluff(current_step, math_valid, logic_valid)
        
        return {
            "path_id": path_id,
            "is_valid": is_valid,
            "bluff_score": round(bluff_score, 2),
            "error_type": error_type
        }

# Example Usage
if __name__ == "__main__":
    validator = StepValidator()
    
    path_id = str(uuid.uuid4())
    step_n = "We know that velocity is distance over time."
    step_n_plus_1 = "Clearly, v = 100 / 0" # Math error (div by zero), plus bluff marker
    
    result = validator.validate_step(path_id, step_n_plus_1, step_n)
    print(f"Validation Result: {result}")
