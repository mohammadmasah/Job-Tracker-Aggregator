from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Contact, ContactUpdate, ContactRead

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("")
def create_contact(contact: Contact, session: Session = Depends(get_session)):
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.get("", response_model=list[ContactRead])
def get_contacts(session: Session = Depends(get_session)):
    return session.exec(select(Contact)).all()


@router.get("/by-application/{application_id}", response_model=list[ContactRead])
def get_application_contacts(
    application_id: int, session: Session = Depends(get_session)
):
    return session.exec(
        select(Contact).where(Contact.application_id == application_id)
    ).all()


@router.patch("/{id}")
def update_contact(
    id: int, data: ContactUpdate, session: Session = Depends(get_session)
):
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    contact_data = data.model_dump(exclude_unset=True)
    for key, value in contact_data.items():
        setattr(contact, key, value)

    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/{id}")
def delete_contact(id: int, session: Session = Depends(get_session)):
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    session.delete(contact)
    session.commit()
    return {"message": "Contact deleted"}
