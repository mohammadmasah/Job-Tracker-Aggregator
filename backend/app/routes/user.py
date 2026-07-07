from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import User

router = APIRouter(prefix="/api/user", tags=["user"])

# Create user
@router.post("")
def create_user(user: User, session: Session = Depends(get_session)):
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

# GET
# All
@router.get("")
def get_user(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

