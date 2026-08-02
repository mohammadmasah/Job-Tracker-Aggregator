import axios from "axios";

// Create
export const createApplication = (data) => {
    return axios.post("/api/applications", { withCredentials: true }, data);
}

// Get
// All
export const getApplications = () => {
    return axios.get("/api/applications", { withCredentials: true });
}

// By id
export const getApplicationById = (id) => {
    return axios.get(`/api/applications/${id}`, { withCredentials: true });
}

// By status
export const getApplicationByStatus = (status) => {
    return axios.get(`/api/applications/status/${status}`, { withCredentials: true });
}

// Count
export const getApplicationsCount = () => {
    return axios.get("/api/applications/count", { withCredentials: true })
}


// Delete
export const deleteApplication = (id) => {
    return axios.delete(`/api/applications/${id}`, { withCredentials: true })
}

// Update
export const updateApplication = (id, data) => {
    return axios.patch(`/api/applications/${id}`, { withCredentials: true }, data)
}