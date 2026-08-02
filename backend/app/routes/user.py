import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlmodel import Session, select
from pydantic import BaseModel

from ..database import get_session
from ..models import User, UserCreate, UserLogin
from ..core.security import hash_password, verify_password,create_access_token

from datetime import timedelta

from app.api.deps import get_current_user
from ..api.deps import require_admin

from app.core.redis_client import redis_client
from app.core.email import send_reset_password_email

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/user", tags=["user"])


class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str


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
@limiter.limit("5/minute")
def login(
    credentials: UserLogin,
    response: Response,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    email = credentials.email
    lock_key = f"lock:{email}"
    attempts_key = f"failed:{email}"

    if redis_client.get(lock_key):
        raise HTTPException(
            status_code=403,
            detail="Votre compte est bloqué suite à 3 tentatives échouées. Consultez votre e-mail pour réinitialiser votre mot de passe."
        )

    user = session.exec(select(User).where(User.email == email)).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        attempts = redis_client.incr(attempts_key)

        if attempts >= 3:
            redis_client.set(lock_key, "locked")
            redis_client.delete(attempts_key)

            reset_token = secrets.token_urlsafe(32)
            redis_client.setex(f"reset_token:{reset_token}", 1800, email)

            send_reset_password_email(email, reset_token)

            raise HTTPException(
                status_code=403,
                detail="Compte bloqué après 3 échecs. Un e-mail de réinitialisation vous a été envoyé."
            )

        raise HTTPException(status_code=401, detail="Invalid identification")

    redis_client.delete(attempts_key)

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

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordSchema,
    session: Session = Depends(get_session)
):
    email = redis_client.get(f"reset_token:{data.token}")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Le jeton de réinitialisation est invalide ou a expiré."
        )

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    user.hashed_password = hash_password(data.new_password)
    session.add(user)
    session.commit()

    redis_client.delete(f"lock:{email}")
    redis_client.delete(f"reset_token:{data.token}")

    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "lastname": current_user.lastname,
        "email": current_user.email,
        "role": current_user.role,
    }
<<<<<<< HEAD


@router.get("")
def get_user(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
=======
    

@router.get("")
def get_user(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@router.post("/logout")
def logout(response: Response, current_user : User = Depends(get_current_user)):
    response.delete_cookie("access_token")
    return {"message": "Disconnected"}

>>>>>>> crudProtection
