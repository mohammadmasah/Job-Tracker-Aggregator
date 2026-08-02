from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlmodel import Session, select
import shutil
import os
import uuid

from ..database import get_session
from ..api.deps import get_current_user
from ..models import Document, DocumentUpdate, Application

router = APIRouter(prefix="/api/documents", dependencies=[Depends(get_current_user)], tags=["documents"])

UPLOAD_DIR = "uploads"


# Upload (création) — reçoit un fichier


@router.post("/{application_id}")
def upload_document(
    application_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Nom unique pour éviter les collisions
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document = Document(
        application_id=application_id,
        filename=file.filename,  # nom original lisible
        path=file_path,  # chemin unique sur le disque
    )
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


# Liste de tous les documents
@router.get("")
def get_documents(session: Session = Depends(get_session)):
    return session.exec(select(Document)).all()


# Supprimer
@router.delete("/{id}")
def delete_document(id: int, session: Session = Depends(get_session)):
    document = session.get(Document, id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Supprimer aussi le fichier physique du disque
    if os.path.exists(document.path):
        os.remove(document.path)

    session.delete(document)
    session.commit()
    return {"message": "Document deleted"}
