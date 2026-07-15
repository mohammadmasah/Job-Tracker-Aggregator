import axios from "axios";

// UPLOAD — envoie un fichier lié à une candidature
// Le backend attend l'application_id dans l'URL et le fichier en multipart/form-data
export const uploadDocument = (applicationId, file) => {
    const formData = new FormData();
    formData.append("file", file);

    return axios.post(`/api/documents/${applicationId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// GET — liste de tous les documents
export const getDocuments = () => {
    return axios.get("/api/documents");
};

// DELETE
export const deleteDocument = (id) => {
    return axios.delete(`/api/documents/${id}`);
};