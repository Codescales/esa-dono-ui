import client from './client.js';
export const getGoals = () => client.get('/goals').then((r) => r.data);
export const contributeGoal = (id, amount_cents) =>
  client.post(`/goals/${id}/contribute`, { amount_cents }).then((r) => r.data);
