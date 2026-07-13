from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer, CreateOffer, ReadOffer
from ..services import fetch_offers

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.post("")
async def offers(session: Session = Depends(get_session)):
    row_data = fetch_offers()
    offers_list = row_data.get("values", [])

    for offer in offers_list:
        details_info = offer.get("details", {})
        salary_info = details_info.get("salary", {})
        
        skills_list = offer.get("skillsList", {})
        skills = ", ".join(s.get("name", "") for s in skills_list)
        
        company_info = offer.get("smallCompany", {})
        company_name = company_info.get("companyName")
        salary_currency = salary_info.get("currency")
        salary_min = salary_info.get("min")
        salary_max = salary_info.get("max")

        new_offer = Offer(
            title=offer.get("title"),
            company=company_name,
            description=offer.get("mdDescription"),
            descriptionPreview=offer.get("descriptionPreview"),
            localisation=offer.get("formattedPlaces", []),
            createdAt=offer.get("createdAt"),
            start=details_info.get("start"),
            sectors=company_info.get("sectors", []),
            
            skills=skills,
            
            salary_currency=salary_currency,
            salary_min=salary_min,
            salary_max=salary_max,
        )

        session.add(new_offer)

    session.commit()
    return offers_list


@router.get("")
def read_offers(session: Session = Depends(get_session)):
    return session.exec(select(Offer)).all()
