from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool
from httpx import TimeoutException
import asyncio

from app.services.ai_agents import generate_chatbot_response
from ..api.deps import get_current_user

router = APIRouter(
    prefix = "/chatbot",
    dependencies=[Depends(get_current_user)],
    tags = ["Chatbot"]
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "dafault_session"

@router.post("/")
async def chat_with_assistant(request: ChatRequest):
    """
    """
    try: 
        user_text = request.message
        session_id = request.session_id
        bot_reply = await asyncio.wait_for(
            run_in_threadpool(generate_chatbot_response, user_text, session_id=session_id),
            timeout=90,
        )
        return {"response": bot_reply}
    
    except (TimeoutError, TimeoutException):
        raise HTTPException(status_code=504, detail="Le modèle met trop de temps à répondre. Réessaie.")
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
