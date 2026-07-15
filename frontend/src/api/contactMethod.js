import axios from "axios";

export const createContactMethod = (contactId, data) => {
    return axios.post(`/api/contact-methods/${contactId}`, data);
};

// UPDATE
export const updateContactMethod = (id, data) => {
    return axios.patch(`/api/contact-methods/${id}`, data);
};

// DELETE
export const deleteContactMethod = (id) => {
    return axios.delete(`/api/contact-methods/${id}`);
};