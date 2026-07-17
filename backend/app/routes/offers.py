from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.get("")
def read_offers(source: str | None = None, session: Session = Depends(get_session)):
    """Récupère toutes les offres enregistrées en BDD (les 2 sources confondues si source est None)"""
    query = select(Offer)
    if source:
        query = query.where(Offer.source == source)
    
    # Renvoie les offres triées par date de création si nécessaire
    return session.exec(query).all()