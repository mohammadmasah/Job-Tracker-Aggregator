import axios from "axios"

export const scrapeOffers = () => {
    return axios.post("/api/offers")
}

export const fetchOffers = () => {
    return axios.get("/api/offers")
}

export const markOfferSeen = (id, seen = true) =>
    api.patch(`/api/offers/${id}/seen`, null, { params: { seen } });
