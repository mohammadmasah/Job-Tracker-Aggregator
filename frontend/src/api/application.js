import axios from "axios";

// Create
export const createApplication = (data) => {
    return axios.post("/api/applications", data);
}

// Get
// All
export const getApplications = () => {
    return axios.get("/api/applications");
}

// By id
export const getApplicationById = (id) => {
    return axios.get(`/api/applications/${id}`);
} 

// By status
export const getApplicationByStatus = (status) => {
    return axios.get(`/api/applications/status/${status}`);
}

// Count
export const getApplicationsCount = () => {
    return axios.get("/api/applications/count")
}


// Delete
export const deleteApplication = (id) => {
    return axios.delete(`/api/applications/${id}`)
}

// Update
export const updateApplication = (id, data) => {
    return axios.patch(`/api/applications/${id}`, data)
}