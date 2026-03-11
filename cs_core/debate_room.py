import autogen
import json
import os
from typing import Dict, Any, List

# Define your LLM configuration
llm_config = {
    # Using a placeholder model, in reality you'd configure an API key
    "model": "gpt-4-turbo", 
    "temperature": 0.2,     # Keep it low for deterministic grading
}

# Add API key from environment if available, or placeholder for syntax compilation
if "OPENAI_API_KEY" in os.environ:
    llm_config["api_key"] = os.environ["OPENAI_API_KEY"]
else:
    llm_config["api_key"] = "placeholder-key-for-compilation"

# 1. The Teacher Agent (Rubric Creator)
teacher_agent = autogen.AssistantAgent(
    name="Teacher_Agent",
    system_message="""You are a strict but fair expert Teacher. 
    Your sole responsibility is to look at the original question and the Knowledge Graph context. 
    You must output a strict KT-PSP grading rubric defining exactly what 'Conceptual Understanding' 
    and 'Procedural Fluency' look like for this specific problem. Do not grade the student yet.""",
    llm_config=llm_config,
)

# 2. The Student Evaluator Agent (The Advocate)
student_evaluator = autogen.AssistantAgent(
    name="Student_Evaluator",
    system_message="""You are the Student Evaluator. You will receive:
    1. The Teacher's rubric.
    2. The extracted reasoning path.
    3. The Step Validator's NLI/SymPy results.
    Your job is to map the student's steps to the rubric. If the math is wrong (SymPy failed) 
    but the logic is sound (NLI passed), you must argue for partial credit on Conceptual Understanding.""",
    llm_config=llm_config,
)

# 3. The Judge Agent (The Final Call)
judge_agent = autogen.AssistantAgent(
    name="Judge_Agent",
    system_message="""You are the Final Judge. You review the rubric and the Evaluator's arguments. 
    You must heavily penalize any step with a high Bluff Score. 
    Your final output MUST be a strict JSON string matching our schema, containing:
    { "path_id": string, "final_score": float, "partial_credit_awarded": boolean, "primary_error_type": string, "bluff_penalty_applied": boolean }
    This JSON feeds directly into the IEM Analytics engine. DO NOT OUTPUT ANY OTHER TEXT besides the valid JSON block.""",
    llm_config=llm_config,
)

# 4. The User Proxy (The Orchestrator)
# This agent acts as the system feeding the initial data into the chat
user_proxy = autogen.UserProxyAgent(
    name="System_Proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=0,
    code_execution_config=False,
)

def run_grading_debate(question: str, reasoning_path: List[Dict[str, Any]], validation_data: Dict[str, Any]) -> str:
    """
    Triggers the multi-agent debate and returns the Judge's final JSON.
    """
    # 5. Set up the GroupChat dynamically for each request so state is clean
    debate_chat = autogen.GroupChat(
        agents=[user_proxy, teacher_agent, student_evaluator, judge_agent],
        messages=[],
        max_round=4, # Strict limit to prevent endless debating
        speaker_selection_method="round_robin"
    )

    manager = autogen.GroupChatManager(groupchat=debate_chat, llm_config=llm_config)
    
    initial_prompt = f"""
    Question: {question}
    Reasoning Path: {json.dumps(reasoning_path)}
    Validation Data (NLI/Math/Bluff): {json.dumps(validation_data)}
    
    Teacher_Agent, please establish the rubric.
    """
    
    # Start the chat
    user_proxy.initiate_chat(
        manager,
        message=initial_prompt,
        summary_method="last_msg"
    )
    
    # Extract the last message (which will be the Judge's JSON output)
    # The summary_method from initiate_chat actually returns the ChatResult object.
    # To get the raw history, we can access the messages from the manager.
    
    try:
        chat_history = user_proxy.chat_messages[manager]
        if chat_history:
            final_output = chat_history[-1]["content"]
            return final_output
        return "{}"
    except Exception as e:
        print(f"Error extracting group chat response: {e}")
        return "{}"

# Example Usage
if __name__ == "__main__":
    dummy_q = "Calculate the final velocity of an object dropped from 10m."
    dummy_path = [{"step_num": 1, "text": "Applies conservation of energy: mgh = 1/2 mv^2"}]
    dummy_val = {"path_id": "123", "is_valid": True, "bluff_score": 0.05, "error_type": None}
    
    print("Initializing Debate Room (Requires API Key to execute LLM)...")
    # result = run_grading_debate(dummy_q, dummy_path, dummy_val)
    # print(result)
    print("Syntax Compiled successfully.")
