import client from './client.js';
export const getDonor = () => client.get('/donor').then((r) => r.data);
