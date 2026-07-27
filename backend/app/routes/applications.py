from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Application, ApplicationCreate, ApplicationUpdate, ApplicationRead
from ..api.deps import get_current_user

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
    session.delete(application)
    session.commit()
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
