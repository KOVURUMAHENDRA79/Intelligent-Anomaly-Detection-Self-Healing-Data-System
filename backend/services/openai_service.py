import os
import json
from openai import OpenAI
from typing import Dict, Any, List
from .chat_tools import get_recent_anomalies, get_anomaly_explanation, get_recent_predictions
from sqlalchemy.orm import Session

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY", "dummy_key")
        try:
            self.client = OpenAI(api_key=api_key)
        except Exception:
            self.client = None

    def analyze_root_cause(self, anomaly_features: tuple, shap_values: Dict[str, Any]) -> str:
        """Legacy RCA generator (replaced by RCA statistical service for anomalies, kept for testing)."""
        return "RCA output replaced by data-driven rca_service."

    def generate_report_text(self, prompt: str) -> str:
        if not self.client or os.getenv("OPENAI_API_KEY") == "dummy_key":
            return "Sample summary generated locally as no API key was provided."
            
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a senior data Analyst writing professional operational summaries."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except:
            return "Could not contact OpenAI for report."

    def interactive_chat_with_tools(self, db: Session, messages_history: List[Dict[str, str]]) -> str:
        """
        Executes true Function Calling against OpenAI. 
        Passes previous session history and gives the model tools to query the DB dynamically.
        """
        if not self.client or os.getenv("OPENAI_API_KEY") == "dummy_key":
            return "(Mock Mode) I am your interactive assistant. Please provide an OPENAI_API_KEY to search live anomalies."

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_recent_anomalies",
                    "description": "Fetch a list of the most recent anomalies detected in the system.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Number of anomalies to fetch (default 5, max 20)"}
                        }
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_anomaly_explanation",
                    "description": "Get extreme details, SHAP values, and structural Root Cause Analysis for a specific Anomaly ID.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "anomaly_id": {"type": "integer", "description": "The strict ID of the anomaly."}
                        },
                        "required": ["anomaly_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_recent_predictions",
                    "description": "Get forecasted ML predictions and future risk scores of the data stream.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Number of predictions to fetch (1-10)"}
                        }
                    }
                }
            }
        ]

        # Ensure system prompt is explicitly positioned as instruction 0
        sys_msg = {"role": "system", "content": "You are ERTAIS, an expert operational intelligence AI. Use the supplied tools to lookup real system anomalies. If asked 'why did this happen', lookup the specific anomaly explanation (get_anomaly_explanation). Always cite explicit Event IDs and Data Confidence Metrics. Keep interpretations concise, strictly based on data returned by tools."}
        
        # We copy the history to avoid modifying the caller's list
        conversation = [sys_msg] + messages_history

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=conversation,
                tools=tools,
                tool_choice="auto",
                temperature=0.2
            )
            
            response_message = response.choices[0].message
            
            # 1. Model used a tool
            if response_message.tool_calls:
                conversation.append(response_message)
                
                for tool_call in response_message.tool_calls:
                    function_name = tool_call.function.name
                    arguments = json.loads(tool_call.function.arguments)
                    
                    if function_name == "get_recent_anomalies":
                        func_result = get_recent_anomalies(db, arguments.get("limit", 5))
                    elif function_name == "get_anomaly_explanation":
                        func_result = get_anomaly_explanation(db, arguments.get("anomaly_id"))
                    elif function_name == "get_recent_predictions":
                        func_result = get_recent_predictions(db, arguments.get("limit", 5))
                    else:
                        func_result = json.dumps({"error": "Unknown function"})
                        
                    conversation.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "name": function_name,
                        "content": func_result
                    })
                    
                # 2. Re-prompt OpenAI with the tool output so it can analyze the DB JSON
                final_response = self.client.chat.completions.create(
                    model="gpt-4o",
                    messages=conversation, # type: ignore
                    temperature=0.3
                )
                return final_response.choices[0].message.content.strip()

            # 3. Model just replied without tools
            return response_message.content.strip()
            
        except Exception as e:
            return f"Error executing intelligent chat: {str(e)}"

openai_service = OpenAIService()
