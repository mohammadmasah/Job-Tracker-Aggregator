# ============================================================
# ROUTES CONTACTS — routes/contacts.py (many-to-many)
# ============================================================
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Contact, ContactCreate, ContactUpdate, ContactRead, Application
from ..api.deps import get_current_user


router = APIRouter(
    prefix="/api/contacts", dependencies=[Depends(get_current_user)], tags=["contacts"]
)


# Convertit un Contact en ContactRead (avec la liste des application_ids)
def to_read(contact: Contact) -> ContactRead:
    return ContactRead(
        id=contact.id,
        name=contact.name,
        notes=contact.notes,
        methods=contact.methods,
        application_ids=[a.id for a in contact.applications],
    )


@router.post("", response_model=ContactRead)
def create_contact(data: ContactCreate, session: Session = Depends(get_session)):
    contact = Contact(name=data.name, notes=data.notes)
    # Lier les candidatures fournies
    if data.application_ids:
        apps = session.exec(
            select(Application).where(Application.id.in_(data.application_ids))
        ).all()
        contact.applications = apps
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return to_read(contact)


@router.get("", response_model=list[ContactRead])
def get_contacts(session: Session = Depends(get_session)):
    contacts = session.exec(select(Contact)).all()
    return [to_read(c) for c in contacts]


@router.get("/by-application/{application_id}", response_model=list[ContactRead])
def get_application_contacts(
    application_id: int, session: Session = Depends(get_session)
):
    app = session.get(Application, application_id)
    if not app:
        raise HTTPException(404, "Application not found")
    return [to_read(c) for c in app.contacts]


@router.patch("/{id}", response_model=ContactRead)
def update_contact(
    id: int, data: ContactUpdate, session: Session = Depends(get_session)
):
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return to_read(contact)


# --- Gestion des liens candidature ↔ contact ---


@router.post("/{id}/applications/{application_id}", response_model=ContactRead)
def link_application(
    id: int, application_id: int, session: Session = Depends(get_session)
):
    contact = session.get(Contact, id)
    app = session.get(Application, application_id)
    if not contact or not app:
        raise HTTPException(404, "Contact ou candidature introuvable")
    if app not in contact.applications:
        contact.applications.append(app)
        session.add(contact)
        session.commit()
        session.refresh(contact)
    return to_read(contact)


@router.delete("/{id}/applications/{application_id}", response_model=ContactRead)
def unlink_application(
    id: int, application_id: int, session: Session = Depends(get_session)
):
    contact = session.get(Contact, id)
    app = session.get(Application, application_id)
    if not contact or not app:
        raise HTTPException(404, "Contact ou candidature introuvable")
    if app in contact.applications:
        contact.applications.remove(app)
        session.add(contact)
        session.commit()
        session.refresh(contact)
    return to_read(contact)


@router.delete("/{id}")
def delete_contact(id: int, session: Session = Depends(get_session)):
    contact = session.get(Contact, id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    session.delete(contact)
    session.commit()
    return {"message": "Contact deleted"}
