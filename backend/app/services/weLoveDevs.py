import os
import httpx
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("WELOVEDEVS_API_KEY")
URL = os.getenv("WELOVEDEVS_URL")

def fetch_offers(query: str = "", page: int = 50, source: str = "welovedevs"):
    url = URL
    headers = {
        "X-API-KEY": API_KEY,
        "Accept": "application/json"
    }
    params = {"q": query, "page": page}
    
    response = httpx.get(url, headers=headers, params=params)
    response.raise_for_status()
    data = response.json()
    return {"source": source, "data": data}