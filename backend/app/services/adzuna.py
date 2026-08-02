import os
import httpx
from dotenv import load_dotenv

load_dotenv()
APP_ID = os.getenv("ADZUNA_APP_ID")
API_KEY = os.getenv("ADZUNA_API_KEY")
BASE_URL = os.getenv("ADZUNA_URL", "https://api.adzuna.com/v1/api/jobs")


def fetch_adzuna(
    query: str = "", page: int = 1, country: str = "fr", source: str = "adzuna"
):
    """Récupère les offres Adzuna. Retourne {source, data}."""
    url = f"{BASE_URL}/{country}/search/{page}"

    params = {
        "app_id": APP_ID,
        "app_key": API_KEY,
        "results_per_page": 50,
        "what": query,
        "content-type": "application/json",
    }
    response = httpx.get(url, params=params, timeout=10.0)
    response.raise_for_status()
    return {"source": source, "data": response.json()}
