import axios from 'axios';

export const uploadDocument = (applicationId, file, type = 'other') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return axios.post(`/api/documents/${applicationId}`, formData);
};
export const getDocuments = (applicationId) => axios.get('/api/documents', {
    params: applicationId ? { application_id: applicationId } : {},
});
export const deleteDocument = (id) => axios.delete(`/api/documents/${id}`);
export async function downloadDocument(document) {
    const response = await axios.get(`/api/documents/${document.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = document.filename;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
