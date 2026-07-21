from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from ..database import get_session
from ..models import User, UserCreate, UserLogin

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
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
@limiter.limit("3/minute")
@limiter.limit("15/hour")
@limiter.limit("30/day")
def login(
    request: Request,
    credentials: UserLogin,
    response: Response,
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.email == credentials.email)
    ).first()
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

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "lastname": current_user.lastname,
        "email": current_user.email,
        "role": current_user.role,
    }


@router.get("")
def get_user(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()