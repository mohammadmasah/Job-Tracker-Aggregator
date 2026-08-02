import axios from "axios";

export const scrapeUrl = (url) => {
    return axios.post("/api/scrape", { url });
};