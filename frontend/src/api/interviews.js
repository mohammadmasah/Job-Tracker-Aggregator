import axios from 'axios';
const config = { withCredentials: true };
export const searchInterviewSources = (params, signal) => axios.get('/api/interviews/sources', { ...config, params, signal });
export const listInterviews = (offset = 0) => axios.get('/api/interviews', { ...config, params: { offset } });
export const createInterview = data => axios.post('/api/interviews', data, config);
export const getInterview = id => axios.get(`/api/interviews/${id}`, config);
export const configureInterview = (id, data) => axios.patch(`/api/interviews/${id}`, data, config);
export const deleteInterview = id => axios.delete(`/api/interviews/${id}`, config);
export const practiceInterview = (id, data) => axios.post(`/api/interviews/${id}/practice`, data, { ...config, timeout: 160_000 });
export const extractInterviewCV = file => {
    const data = new FormData(); data.append('file', file);
    return axios.post('/api/interviews/extract-cv', data, config);
};
export const interviewError = error => typeof error.response?.data?.detail === 'string' ? error.response.data.detail : 'Connexion interrompue. Recharge la séance pour retrouver ton avancée, puis réessaie.';
