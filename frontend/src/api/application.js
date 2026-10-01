import axios from "axios";

// Create
export const createApplication = (data) => {
    return axios.post("/api/applications", data, { withCredentials: true });
}

// Get
// All
export const getApplications = () => {
    return axios.get("/api/applications", { withCredentials: true });
}

export const exportApplications = (status = 'all') => axios.get('/api/applications/export.xlsx', {
    withCredentials: true,
    responseType: 'blob',
    timeout: 60_000,
    params: status === 'all' ? {} : { status },
});

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
    return axios.patch(`/api/applications/${id}`, data, { withCredentials: true })
}
