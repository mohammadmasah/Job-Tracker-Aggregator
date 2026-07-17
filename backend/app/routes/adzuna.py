from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..database import get_session
from ..models import Offer
from ..services.adzuna import fetch_adzuna

router = APIRouter(prefix="/api/adzuna", tags=["adzuna"])


@router.post("/scrape")
def scrape_adzuna(query: str = "", page: int = 1, session: Session = Depends(get_session)):
    raw = fetch_adzuna(query=query, page=page)
    source = raw.get("source")
    results = raw["data"].get("results", [])

    added = 0
    for offer in results:
        reference = str(offer.get("id", ""))
        if not reference:
            continue

        # Anti-doublon (source + reference)
        exists = session.exec(
            select(Offer).where(Offer.source == source, Offer.reference == reference)
        ).first()
        if exists:
            continue

        location = offer.get("location", {}) or {}
        company = offer.get("company", {}) or {}
        category = offer.get("category", {}) or {}

        new_offer = Offer(
            source=source,
            reference=reference,
            title=offer.get("title", ""),
            company=company.get("display_name", ""),
            description=offer.get("description", ""),
            descriptionPreview=offer.get("description", "")[:200],
            localisation=location.get("area", []),           # liste de zones
            createdAt=offer.get("created", ""),
            start=None,
            sectors=[category.get("label")] if category.get("label") else [],
            skills=[],                                        # Adzuna ne fournit pas de skills
            salary_currency="EUR",
            salary_min=offer.get("salary_min"),
            salary_max=offer.get("salary_max"),
            url=offer.get("redirect_url"),
            seen=False,
        )
        session.add(new_offer)
        added += 1

    session.commit()
    return {"source": source, "added": added, "total_received": len(results)}
