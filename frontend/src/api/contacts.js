import axios from "axios";

// CREATE
export const createContact = (data) => {
    return axios.post("/api/contacts", data);
};

// GET
// All
export const getContacts = () => {
    return axios.get("/api/contacts");
};
// By application
export const getApplicationContacts = (application_id) => {
    return axios.get(`/api/contacts/by-application/${application_id}`);
};

// UPDATE
export const updateContact = (id, data) => {
    return axios.patch(`/api/contacts/${id}`, data);
};

// DELETE
export const deleteContact = (id) => {
    return axios.delete(`/api/contacts/${id}`);
};

// --- Many-to-many : liens candidature <-> contact ---

// Lier une candidature à un contact
export const linkApplication = (contactId, applicationId) =>
    axios.post(`/api/contacts/${contactId}/applications/${applicationId}`);

// Délier une candidature d'un contact
export const unlinkApplication = (contactId, applicationId) =>
    axios.delete(`/api/contacts/${contactId}/applications/${applicationId}`);