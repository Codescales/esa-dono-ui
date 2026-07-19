import client from './client.js';
export const getCampaign = () => client.get('/campaign').then((r) => r.data);
