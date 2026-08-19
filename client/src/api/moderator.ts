import axios, { type AxiosInstance } from 'axios';

// withCredentials sends the httpOnly donor session cookie (a MODERATOR/ADMIN
// donor authenticates that way). The operational moderator key is a separate
// operator secret sent as an Authorization Bearer credential (ADR 0004).
const moderatorClient: AxiosInstance = axios.create({
  baseURL: '/api/moderator',
  withCredentials: true,
});

moderatorClient.interceptors.request.use((config) => {
  const moderatorKey = localStorage.getItem('moderator_key');
  // Only send the operational key when there's no active donor session; the
  // donor session (httpOnly cookie) is the primary path.
  if (moderatorKey && !localStorage.getItem('donor_session_active')) {
    config.headers.Authorization = `Bearer key_mod_${moderatorKey}`;
  }
  return config;
});

export default moderatorClient;
