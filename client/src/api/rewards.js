import client from './client.js';
export const getRewards = () => client.get('/rewards').then(r => r.data);
export const claimReward = (id, claim_data) => client.post(`/rewards/${id}/claim`, { claim_data }).then(r => r.data);
