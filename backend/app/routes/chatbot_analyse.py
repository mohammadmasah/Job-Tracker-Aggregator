from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from app.services.ai_agents import generate_chatbot_response
from app.services.chat_stream import streaming_chat_response
import pdfplumber
import io
import asyncio
from starlette.concurrency import run_in_threadpool
from httpx import TimeoutException
from ..api.deps import get_current_user
from app.models import User

router = APIRouter(
    prefix="/analyse-cv",
    dependencies=[Depends(get_current_user)],
    tags=["Analyse CV"]
)

@router.post("/")
async def analyse_cv(
    message: str = Form(default=""),
    session_id: str = Form(default="default", min_length=1, max_length=80),
    file: UploadFile = File(...),
    stream: bool = Form(default=False),
    user: User = Depends(get_current_user),
):
    try:
        contents = await file.read()
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            pdf_text = ""
            for page in pdf.pages:
                pdf_text += page.extract_text() or ""

        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="PDF It is empty or has no text.")

        caption = message.strip()
        instruction = caption or "Analyse brièvement ce document et donne jusqu'à 3 remarques concrètes, sans introduction."
        full_message = f"{instruction}\n\n Content PDF:\n{pdf_text}"
        session_id = f"{user.id}:{session_id}"
        display_message = "\n\n".join(filter(None, [file.filename or "Document PDF", caption]))
        if stream:
            return streaming_chat_response(full_message, session_id, display_message)
        bot_reply = await asyncio.wait_for(
            run_in_threadpool(generate_chatbot_response, full_message, session_id=session_id, display_message=display_message),
            timeout=90,
        )
        return {"response": bot_reply}

    except HTTPException:
        raise
    except (TimeoutError, TimeoutException):
        raise HTTPException(status_code=504, detail="Le modèle met trop de temps à répondre. Réessaie.")
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
