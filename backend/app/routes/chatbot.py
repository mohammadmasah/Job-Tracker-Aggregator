from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_agents import generate_chatbot_response

router = APIRouter(
    prefix = "/chatbot",
    tags = ["Chatbot"]
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

@router.post("/")
async def chat_with_assistant(request: ChatRequest):
    """
    """
    try: 
        user_text = request.message
        session_id = request.session_id
        bot_reply = generate_chatbot_response(user_text, session_id=session_id)
        return {"response": bot_reply}
    
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))