from fastapi import APIRouter, HTTPException, Depends, Response
from sqlmodel import Session, select

from ..database import get_session
from ..models import User, UserCreate, UserLogin
from app.core.security import hash_password, verify_password,create_access_token

from datetime import timedelta

router = APIRouter(prefix="/api/user", tags=["user"])

@router.post("/register")
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    db_user = User(
        name=user.name,
        lastname=user.lastname,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="user",
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return {"message": "User created"}

@router.post("/login")
def login(credentials: UserLogin,response: Response, session: Session = Depends(get_session)):

    user = session.exec(select(User).where(User.email == credentials.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid identification")

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid identification")

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}

    access_token = create_access_token(
        data=token_data, expires_delta=timedelta(days=14)
    )
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=1209600,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return {
        "message": "Connected successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "lastname": user.lastname,
            "email": user.email,
        },
    }
@router.get("")
def get_user(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
