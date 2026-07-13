from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import re
from bs4 import BeautifulSoup

router = APIRouter(prefix="/api/scrape", tags=["scraper"])


class ScrapeRequest(BaseModel):
    url: str


def get_meta(soup, prop=None, name=None):
    """Récupère le content d'une balise meta (par property OU name)."""
    if prop:
        tag = soup.find("meta", {"property": prop})
        if tag and tag.get("content"):
            return tag["content"].strip()
    if name:
        tag = soup.find("meta", {"name": name})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return ""


def find_in_text(text, patterns):
    """Cherche le premier motif regex qui matche dans le texte."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()
    return ""


@router.post("")
def scrape_job(data: ScrapeRequest):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        ),
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    }

    try:
        response = httpx.get(
            data.url, follow_redirects=True, timeout=15, headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Impossible de recuperer la page : {e}"
        )

    # Detection basique de blocage
    blocked_signals = ["security check", "blocked", "captcha", "are you a robot",
                       "verify you are human", "access denied"]
    title_text = (response.text[:2000] or "").lower()
    if any(sig in title_text for sig in blocked_signals):
        raise HTTPException(
            status_code=422,
            detail="Ce site bloque l'import automatique. Remplissez le formulaire manuellement.",
        )

    soup = BeautifulSoup(response.text, "html.parser")
    page_text = soup.get_text(separator=" ", strip=True)

    result = {}

    # --- POSITION (titre du poste) ---
    result["position"] = (
        get_meta(soup, prop="og:title")
        or get_meta(soup, name="title")
        or (soup.title.text.strip() if soup.title else "")
    )

    # --- COMPANY (entreprise) ---
    result["company"] = (
        get_meta(soup, prop="og:site_name")
        or get_meta(soup, name="author")
        or ""
    )

    # --- NOTES (description) ---
    result["notes"] = (
        get_meta(soup, prop="og:description")
        or get_meta(soup, name="description")
        or ""
    )

    # --- LOCATION (lieu) ---
    # Tente les meta dediees, sinon cherche un motif ville dans le texte
    result["location"] = (
        get_meta(soup, prop="og:locality")
        or get_meta(soup, name="job-location")
        or get_meta(soup, name="geo.placename")
        or ""
    )

    # --- SALARY (salaire) ---
    # Cherche des motifs de salaire dans le texte (€, k€, EUR, par an...)
    salary_patterns = [
        r"\d{2,3}\s?[-a]\s?\d{2,3}\s?k\s?€",
        r"\d{2,3}\s?000\s?[-a]\s?\d{2,3}\s?000\s?€",
        r"\d{2,3}\s?k€",
        r"€\s?\d{2,3}\s?000",
        r"\d{2,3}\s?000\s?€\s?(?:par an|/an|brut)",
    ]
    result["salary"] = find_in_text(page_text, salary_patterns)

    # --- REMOTE (teletravail) ---
    remote_keywords = ["télétravail", "remote", "100% remote", "full remote",
                       "travail à distance", "hybride", "home office"]
    lower_text = page_text.lower()
    result["remote"] = any(kw in lower_text for kw in remote_keywords)

    # --- SECTOR (secteur) ---
    result["sector"] = (
        get_meta(soup, name="industry")
        or get_meta(soup, prop="article:section")
        or ""
    )

    return result