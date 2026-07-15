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