from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from httpx import TimeoutException
import asyncio
from typing import Literal
from langchain_core.messages import HumanMessage, AIMessage

from app.services.ai_agents import generate_chatbot_response
from app.services.chat_stream import streaming_chat_response
from ..api.deps import get_current_user
from app.models import User
from app.services.chat_history import DatabaseChatHistory

router = APIRouter(
    prefix = "/chatbot",
    dependencies=[Depends(get_current_user)],
    tags = ["Chatbot"]
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = Field(default="default", min_length=1, max_length=80)
    display_message: str | None = None
    stream: bool = False

@router.post("/")
async def chat_with_assistant(request: ChatRequest, user: User = Depends(get_current_user)):
    """
    """
    try: 
        user_text = request.message
        session_id = f"{user.id}:{request.session_id}"
        if request.stream:
            return streaming_chat_response(user_text, session_id, request.display_message)
        bot_reply = await asyncio.wait_for(
            run_in_threadpool(generate_chatbot_response, user_text, session_id=session_id, display_message=request.display_message),
            timeout=90,
        )
        return {"response": bot_reply}
    
    except (TimeoutError, TimeoutException):
        raise HTTPException(status_code=504, detail="Le modèle met trop de temps à répondre. Réessaie.")
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/")
def read_history(user: User = Depends(get_current_user)):
    rows = DatabaseChatHistory(user.id, "default").rows()
    return {"messages": [
        {"id": f"stored-{row.id}",
         "role": "user" if row.payload["type"] == "human" else "bot",
         "text": row.payload["data"].get("additional_kwargs", {}).get("display_text") or row.payload["data"]["content"]}
        for row in rows
    ]}


class LocalCommandRequest(BaseModel):
    command: Literal["/help", "/resume", "/relance", "/questions"]


@router.post("/local/")
def save_local_command(request: LocalCommandRequest, user: User = Depends(get_current_user)):
    reply = (
        "Commandes : /resume (résumé de la candidature ouverte), /relance (mail de relance), "
        "/questions (questions d'entretien). Tu peux aussi me poser n'importe quelle question librement !"
        if request.command == "/help" else
        "Ouvre d'abord une candidature (clique une carte) pour que je puisse t'aider dessus."
    )
    DatabaseChatHistory(user.id, "default").add_messages([
        HumanMessage(content=request.command), AIMessage(content=reply),
    ])
    return {"response": reply}
