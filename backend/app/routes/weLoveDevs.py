from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer, CreateOffer, ReadOffer
from ..services import fetch_offers

router = APIRouter(prefix="/api/offer", tags=["offer"])

@router.post("")
async def offers(session: Session = Depends(get_session)):
    row_data = fetch_offers()
    offers_list = row_data.get("values", [])
    
    for offer in offers_list:
        company_info = offer.get("smallCompany", {})
        company_name = company_info.get("companyName")
        
        new_offer = Offer (
            company = company_name
        )
        
        session.add(new_offer)

    session.commit()
    return offers_list
    
@router.get("")
def read_offers(session: Session = Depends(get_session)):
    return session.exec(select(Offer)).all()
        