import axios from 'axios';


const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';


export const api = {
listEmergencies: () => axios.get(`${API_BASE}/api/emergencies`).then(r => r.data),
submitEmergency: (callSid, data) => axios.post(`${API_BASE}/api/emergencies/${callSid}/submit`, data).then(r => r.data),
patchEmergency: (callSid, patch) => axios.patch(`${API_BASE}/api/emergencies/${callSid}`, patch).then(r => r.data),
sseUrl: (callSid) => `${API_BASE}/api/calls/${callSid}/stream`
};