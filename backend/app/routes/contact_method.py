from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Contact,  ContactMethod, ContactMethodCreate, ContactMethodUpdate

router = APIRouter(prefix="/api/contact-methods", tags=["contactMethods"])

@router.post("/{contact_id}")
def crete_contact_method(contact_id: int, data: ContactMethodCreate, session: Session = Depends(get_session)):
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    method = ContactMethod(
        contact_id=contact_id,
        type=data.type,
        value=data.value
    )
    
    session.add(method)
    session.commit()
    session.refresh(method)
    return method


@router.patch("/{id}")
def update_contact_method(id: int, data: ContactMethodUpdate, session: Session = Depends(get_session)):
    contactMethod = session.get(ContactMethod, id)
    if not contactMethod:
        raise HTTPException(status_code=404, detail="Contact method not found")
    
    contactMethod_data = data.model_dump(exclude_unset=True)
    for key, value in contactMethod_data.items():
        setattr(contactMethod, key, value)
        
    session.add(contactMethod)
    session.commit()
    session.refresh(contactMethod)
    return contactMethod


@router.delete("/{id}")
def delete_contact_method(id: int, session: Session = Depends(get_session)):
    contactMethod = session.get(ContactMethod, id)
    if not contactMethod:
        raise HTTPException(status_code=404, detail='Contact method not found')

    session.delete(contactMethod)
    session.commit()
    return {"message": "Contact method deleted"}