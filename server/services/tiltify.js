let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }
  const res = await fetch('https://v5api.tiltify.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.TILTIFY_CLIENT_ID,
      client_secret: process.env.TILTIFY_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });
  if (!res.ok) throw new Error(`Tiltify OAuth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function getCampaign() {
  const token = await getAccessToken();
  const res = await fetch(
    `https://v5api.tiltify.com/api/public/campaigns/${process.env.TILTIFY_CAMPAIGN_ID}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Tiltify campaign fetch failed: ${res.status}`);
  const data = await res.json();
  return data.data ?? data;
}
