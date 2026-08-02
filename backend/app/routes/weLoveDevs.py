from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer
from ..services import fetch_offers
from ..api.deps import get_current_user


router = APIRouter(
    prefix="/api/welovedevs",
    dependencies=[Depends(get_current_user)],
    tags=["welovedevs"],
)


@router.post("")
def scrape_welovedevs(session: Session = Depends(get_session)):
    try:
        raw = fetch_offers()
        source = raw.get("source", "welovedevs")
        offers_list = raw["data"].get("values", [])

        added = 0
        for offer in offers_list:
            ref = offer.get("reference")
            if not ref:
                continue

            reference = str(ref).strip()

            exists = session.exec(
                select(Offer).where(
                    Offer.source == source, Offer.reference == reference
                )
            ).first()
            if exists:
                continue

            details_info = offer.get("details", {}) or {}
            salary_info = details_info.get("salary", {}) or {}
            skills_list = offer.get("skillsList", []) or []
            company_info = offer.get("smallCompany", {}) or {}

            new_offer = Offer(
                source=source,
                reference=reference,
                url=offer.get("url"),
                title=offer.get("title", "Sans titre"),
                company=company_info.get("companyName", "Entreprise inconnue"),
                description=offer.get("mdDescription"),
                descriptionPreview=offer.get("descriptionPreview"),
                localisation=offer.get("formattedPlaces", []),
                createdAt=str(offer.get("createdAt"))
                if offer.get("createdAt")
                else None,
                start=details_info.get("start"),
                sectors=company_info.get("sectors", []),
                skills=[s.get("name", "") for s in skills_list if s.get("name")],
                salary_currency=salary_info.get("currency"),
                salary_min=salary_info.get("min"),
                salary_max=salary_info.get("max"),
            )
            session.add(new_offer)
            added += 1

        session.commit()
        return {"message": f"{added} offres ajoutées", "source": source, "added": added}

    except Exception as e:
        session.rollback()
        print(f"Erreur lors du scraping WeLoveDevs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur WeLoveDevs: {str(e)}")
