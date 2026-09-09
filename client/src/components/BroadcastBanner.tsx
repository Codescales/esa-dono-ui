import { useEffect, useState } from 'react';
import client from '../api/client';

interface BroadcastData {
  message: string | null;
}

export default function BroadcastBanner() {
  const [broadcast, setBroadcast] = useState<BroadcastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await client.get('/campaign/broadcast');
        setBroadcast(response.data);
      } catch (e) {
        console.error('Failed to load broadcast:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !broadcast?.message) return null;

  return (
    <div
      className="px-4 py-3 text-sm text-center font-body"
      style={{
        background:
          'linear-gradient(90deg, rgba(216, 226, 71, 0.15) 0%, rgba(216, 226, 71, 0.05) 100%)',
        borderBottom: '1px solid rgba(216, 226, 71, 0.2)',
        color: 'var(--off-white)',
      }}
    >
      {broadcast.message}
    </div>
  );
}
