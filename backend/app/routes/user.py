from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, UserCreate, UserLogin
from app.core.security import hash_password, verify_password


router = APIRouter(prefix="/api/user", tags=["user"])

# REGISTER + BCRYP
@router.post("/register")
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    db_user = User (
        name=user.name,
        lastname=user.lastname,
        email=user.email,
        hashed_password=hash_password(user.password)
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return {"message": "User created"}

# LOGIN
@router.post("/login")
def login(credentials: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == credentials.email)).first()
    if not user: 
        raise HTTPException(status_code=401, detail="Invalid identification")
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid identification")
    return {"message": "Connected " + user.name}
    
    
# GET
# All
@router.get("")
def get_user(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

