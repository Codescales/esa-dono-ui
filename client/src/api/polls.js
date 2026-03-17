import client from './client.js';
export const getPolls = () => client.get('/polls').then(r => r.data);
export const votePoll = (id, poll_option_id, amount_cents) =>
  client.post(`/polls/${id}/vote`, { poll_option_id, amount_cents }).then(r => r.data);
