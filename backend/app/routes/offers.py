from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer
from ..api.deps import get_current_user


router = APIRouter(prefix="/api/offers", dependencies=[Depends(get_current_user)] ,tags=["offers"])


@router.get("")
def read_offers(source: str | None = None, session: Session = Depends(get_session)):
    query = select(Offer)
    if source:
        query = query.where(Offer.source == source)
    
    return session.exec(query).all()

@router.patch("/{offer_id}/seen")
def mrk_seen(offer_id: int, seen: bool = True, session: Session = Depends(get_session)):
    offer = session.get(Offer, offer_id)
    if not offer:
        raise HTTPException(404, "Application not found")
    offer.seen = seen
    session.add(offer)
    session.commit()
    return {"id": offer_id, "seen": offer.seen}