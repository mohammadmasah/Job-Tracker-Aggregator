from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer, CreateOffer, ReadOffer
from ..services import fetch_offers

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.post("")
async def offers(session: Session = Depends(get_session)):
    raw = fetch_offers()
    source = raw.get("source", "welovedevs")
    offers_list = raw["data"].get("values", [])

    added = 0
    for offer in offers_list:
        ref = offer.get("reference")
        # anti-doublon (voir note plus bas)
        if (
            ref
            and session.exec(
                select(Offer).where(Offer.source == source, Offer.reference == ref)
            ).first()
        ):
            continue

        details_info = offer.get("details", {})
        salary_info = details_info.get("salary", {})
        skills_list = offer.get("skillsList", [])
        company_info = offer.get("smallCompany", {})

        new_offer = Offer(
            source=source,
            reference=ref,
            url=offer.get("url"),
            title=offer.get("title"),
            company=company_info.get("companyName"),
            description=offer.get("mdDescription"),
            descriptionPreview=offer.get("descriptionPreview"),
            localisation=offer.get("formattedPlaces", []),
            createdAt=offer.get("createdAt"),
            start=details_info.get("start"),
            sectors=company_info.get("sectors", []),
            skills=[s.get("name", "") for s in skills_list],
            salary_currency=salary_info.get("currency"),
            salary_min=salary_info.get("min"),
            salary_max=salary_info.get("max"),
        )
        session.add(new_offer)
        added += 1

    session.commit()
    return {"message": f"{added} offres ajoutées", "source": source}


@router.get("")
def read_offers(source: str | None = None, session: Session = Depends(get_session)):
    query = select(Offer)
    if source:
        query = query.where(Offer.source == source)
    return session.exec(query).all()
