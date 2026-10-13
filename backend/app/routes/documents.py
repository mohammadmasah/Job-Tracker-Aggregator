"""Attachments stored in the workspace and explicitly linked to an application."""
from datetime import datetime
from pathlib import Path
from typing import Literal
import logging
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import Session, SQLModel, select
from ..database import get_session
from ..api.deps import get_current_user
from ..models import Document, Application

router = APIRouter(prefix='/api/documents', dependencies=[Depends(get_current_user)], tags=['documents'])
UPLOAD_DIR = 'uploads'
MAX_FILE_BYTES = 20 * 1024 * 1024
DocumentType = Literal['cv', 'cover_letter', 'invitation', 'assignment', 'other']


class DocumentPublic(SQLModel):
    id: int
    application_id: int
    filename: str
    type: str | None = None
    uploaded_at: datetime


def attachment_path(stored_path):
    root = Path(UPLOAD_DIR).resolve()
    path = Path(stored_path).resolve()
    if not path.is_relative_to(root) or path == root:
        raise HTTPException(404, 'Document introuvable.')
    return path


@router.post('/{application_id}', response_model=DocumentPublic)
def upload_document(application_id: int, file: UploadFile = File(...),
                    type: DocumentType = Form(default='other'),
                    session: Session = Depends(get_session)):
    if not session.get(Application, application_id):
        raise HTTPException(404, 'Candidature introuvable.')
    # Never use the client filename as a filesystem path (including Windows separators).
    name = (file.filename or '').replace('\\', '/').split('/')[-1]
    name = ''.join(c for c in name if ord(c) >= 32 and ord(c) != 127).strip()[:240]
    if not name or name in ('.', '..'):
        raise HTTPException(400, 'Choisis un fichier avec un nom valide.')
    root = Path(UPLOAD_DIR)
    root.mkdir(parents=True, exist_ok=True)
    path = root / uuid.uuid4().hex
    try:
        size = 0
        with path.open('xb') as destination:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_BYTES:
                    raise HTTPException(413, 'Le fichier dépasse la limite de 20 Mo.')
                destination.write(chunk)
        if size == 0:
            raise HTTPException(400, 'Le fichier est vide.')
        document = Document(application_id=application_id, filename=name, path=str(path), type=type)
        session.add(document)
        session.flush()
        result = DocumentPublic.model_validate(document)
        session.commit()
        return result
    except Exception:
        session.rollback()
        path.unlink(missing_ok=True)
        raise
    finally:
        file.file.close()


@router.get('', response_model=list[DocumentPublic])
def get_documents(application_id: int | None = None, session: Session = Depends(get_session)):
    query = select(Document)
    if application_id is not None:
        if not session.get(Application, application_id):
            raise HTTPException(404, 'Candidature introuvable.')
        query = query.where(Document.application_id == application_id)
    return session.exec(query.order_by(Document.uploaded_at.desc(), Document.id.desc())).all()


@router.get('/{id}/download')
def download_document(id: int, session: Session = Depends(get_session)):
    document = session.get(Document, id)
    if not document:
        raise HTTPException(404, 'Document introuvable.')
    path = attachment_path(document.path)
    if not path.is_file():
        raise HTTPException(404, 'Le fichier n’est plus disponible sur cet ordinateur.')
    return FileResponse(path, filename=document.filename, media_type='application/octet-stream',
                        headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.delete('/{id}')
def delete_document(id: int, session: Session = Depends(get_session)):
    document = session.get(Document, id)
    if not document:
        raise HTTPException(404, 'Document introuvable.')
    path = attachment_path(document.path)
    session.delete(document)
    session.commit()
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logging.getLogger(__name__).warning('Could not remove file for deleted document %s', id)
    return {'message': 'Document supprimé.'}
