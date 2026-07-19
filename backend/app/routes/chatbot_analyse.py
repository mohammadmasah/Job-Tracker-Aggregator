from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from app.services.ai_agents import generate_chatbot_response
import pdfplumber
import io

router = APIRouter(
    prefix="/analyse-cv",
    tags=["Analyse CV"]
)

@router.post("/")
async def analyse_cv(
    message: str = Form(default="Analyze the CV and provide detailed feedback."),
    session_id: str = Form(default="default_session"),
    file: UploadFile = File(...)
):
    try:
        contents = await file.read()
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            pdf_text = ""
            for page in pdf.pages:
                pdf_text += page.extract_text() or ""

        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="PDF It is empty or has no text.")

        full_message = f"{message}\n\n Content CV:\n{pdf_text}"
        bot_reply = generate_chatbot_response(full_message, session_id=session_id)
        return {"response": bot_reply}

    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))