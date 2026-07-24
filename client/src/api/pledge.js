import client from './client.js';
export const createPledge = (data) => client.post('/pledge', data).then((r) => r.data);
export const getPledge = (token) => client.get(`/pledge/${token}`).then((r) => r.data);
