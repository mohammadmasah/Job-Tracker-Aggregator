import axios from "axios"

export const scrapeOffers = () => {
    return axios.post("/api/offers")
}

export const fetchOffers = () => {
    return axios.get("/api/offers")
}