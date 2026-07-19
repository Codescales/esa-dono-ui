export function extractToken(input) {
  const value = (input || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    return url.searchParams.get('token') || value;
  } catch {
    return value;
  }
}

export function setDonorToken(token) {
  localStorage.setItem('donor_token', token);
  window.dispatchEvent(new Event('donor-token-changed'));
}

export function clearDonorToken() {
  localStorage.removeItem('donor_token');
  window.dispatchEvent(new Event('donor-token-changed'));
}
