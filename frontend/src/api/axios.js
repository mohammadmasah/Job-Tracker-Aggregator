import axios from "axios";

const api = axios.create({
    baseURL: "gttp://localhost:8000/api/",
    // withCredentials: true,
});

export default api;