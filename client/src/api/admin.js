import axios from 'axios';

const adminClient = axios.create({ baseURL: '/api/admin' });

adminClient.interceptors.request.use(config => {
  const key = localStorage.getItem('admin_key');
  if (key) config.headers['X-Admin-Key'] = key;
  return config;
});

export default adminClient;
