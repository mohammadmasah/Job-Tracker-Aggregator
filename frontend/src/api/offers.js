import axios from "axios";

// 1. Appelle le scraper dédié à WeLoveDevs
export const scrapeOffers = () => {
    return axios.post("/api/welovedevs"); 
};

// 2. Appelle le scraper dédié à Adzuna
export const fetchAzduna = (query = "developer", page = 1) => {
    return axios.post("/api/adzuna", null, {
        params: { query, page }
    });
};

// 3. Récupère TOUTES les offres combinées depuis la base de données
export const fetchOffers = () => {
    return axios.get("/api/offers");
};

// 4. Marquer comme lu
export const markOfferSeen = (id, seen = true) =>
    axios.patch(`/api/offers/${id}/seen`, null, { params: { seen } });