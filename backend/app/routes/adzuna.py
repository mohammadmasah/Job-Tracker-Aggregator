from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import traceback

from ..database import get_session
from ..models import Offer
from ..services.adzuna import fetch_adzuna
from ..api.deps import get_current_user

router = APIRouter(prefix="/api/adzuna", dependencies=[Depends(get_current_user)] ,tags=["adzuna"])


@router.post("")
def scrape_adzuna(query: str = "", page: int = 1, session: Session = Depends(get_session)):
    try:
        raw = fetch_adzuna(query=query, page=page)
        source = raw.get("source", "adzuna")
        results = raw["data"].get("results", [])

        added = 0
        for offer in results:
            raw_id = offer.get("id")
            if raw_id is None:
                continue
            reference = str(raw_id).strip()

            exists = session.exec(
                select(Offer).where(Offer.source == source, Offer.reference == reference)
            ).first()
            if exists:
                continue

            location = offer.get("location", {}) or {}
            company = offer.get("company", {}) or {}
            category = offer.get("category", {}) or {}
            
            area_list = location.get("area", [])
            if not isinstance(area_list, list):
                localisation_data = [str(area_list)] if area_list else []
            else:
                localisation_data = [str(area) for area in area_list if area]

            created_at_raw = offer.get("created", "")
            created_at_str = str(created_at_raw) if created_at_raw else None

            new_offer = Offer(
                source=source,
                reference=reference,
                title=offer.get("title", "Sans titre"),
                company=company.get("display_name", "Entreprise inconnue"),
                description=offer.get("description", ""),
                descriptionPreview=str(offer.get("description", ""))[:200],
                localisation=localisation_data,
                createdAt=created_at_str,
                start=None,
                sectors=[str(category.get("label"))] if category.get("label") else [],
                skills=[],                                        
                salary_currency="EUR",
                salary_min=offer.get("salary_min"),
                salary_max=offer.get("salary_max"),
                url=offer.get("redirect_url"),
            )
            session.add(new_offer)
            added += 1

        session.commit()
        return {"source": source, "added": added, "total_received": len(results)}

    except Exception as e:
        print("====== ERREUR DURANT LE SCRAPING ADZUNA ======")
        traceback.print_exc()
        print("==============================================")
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")