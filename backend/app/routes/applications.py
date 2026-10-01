import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from ..database import get_session
from ..models import Application, ApplicationCreate, ApplicationUpdate, ApplicationRead
from ..api.deps import get_current_user
from ..models.contact import Contact
from ..services.application_export import export_applications, STATUSES

router = APIRouter(prefix="/api/applications", dependencies=[Depends(get_current_user)], tags=["applications"])


# Create application


@router.post("")
def create_application(
    data: ApplicationCreate, session: Session = Depends(get_session)
):
    application = Application(**data.model_dump(exclude_unset=True))
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


# Get #
# All
@router.get("", response_model=list[ApplicationRead])
def get_applications(session: Session = Depends(get_session)):
    return session.exec(select(Application)).all()


# Count
@router.get("/count")
def get_count(session: Session = Depends(get_session)):
    applications = session.exec(select(Application)).all()
    return {"Count:": len(applications)}


# By status
@router.get("/status/{status}")
def get_by_status(status: str, session: Session = Depends(get_session)):
    applications = session.exec(
        select(Application).where(Application.status == status)
    ).all()
    return applications


# Excel export (before the dynamic ID route)
@router.get('/export.xlsx')
def download_applications(status: str | None = None, session: Session = Depends(get_session)):
    if status is not None and status not in STATUSES:
        raise HTTPException(status_code=422, detail='Statut de candidature invalide')
    query = select(Application).options(selectinload(Application.contacts).selectinload(Contact.methods))
    if status:
        query = query.where(Application.status == status)
    now = datetime.now()
    content = export_applications(session.exec(query).all(), status=status, generated_at=now)
    filename = f'trackit-candidatures-{status or "toutes"}-{now:%Y-%m-%d}.xlsx'
    return Response(content, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    headers={'Content-Disposition': f'attachment; filename="{filename}"', 'Cache-Control': 'no-store'})


# By id
@router.get("/{id}", response_model=ApplicationRead)
def get_application(id: int, session: Session = Depends(get_session)):
    application = session.get(Application, id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


# Delete #


@router.delete("/{id}")
def delete_application(id: int, session: Session = Depends(get_session)):
    application = session.get(Application, id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    document_paths = [document.path for document in application.documents]
    for document in list(application.documents):
        session.delete(document)
    session.delete(application)
    session.commit()
    # Only remove files owned by the upload directory, after the DB commit.
    upload_root = Path("uploads").resolve()
    for stored_path in document_paths:
        path = Path(stored_path).resolve()
        if path.is_relative_to(upload_root):
            try:
                path.unlink(missing_ok=True)
            except OSError:
                logging.getLogger(__name__).exception("Could not remove attachment for deleted application %s", id)
    return {"message": "Application deleted"}


# Udpdate #


@router.patch("/{id}")
def update_application(
    id: int, data: ApplicationUpdate, session: Session = Depends(get_session)
):
    application = session.get(Application, id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application_data = data.model_dump(exclude_unset=True)
    for key, value in application_data.items():
        setattr(application, key, value)

    session.add(application)
    session.commit()
    session.refresh(application)
    return application
