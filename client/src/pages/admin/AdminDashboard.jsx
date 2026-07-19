import { useEffect, useState } from 'react';
import adminClient from '../../api/admin.js';
import Card from '../../components/Card.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminClient
      .get('/stats')
      .then((r) => setStats(r.data))
      .catch(() => setError('Failed to load stats.'));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <LoadingSpinner />;

  const cards = [
    { label: 'Total Raised', value: fmt(stats.total_raised_cents) },
    { label: 'Donors', value: stats.donors },
    { label: 'Donations', value: stats.donations },
    { label: 'Reward Claims', value: stats.claims },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="text-center">
            <p className="text-gray-500 text-sm">{c.label}</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{c.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
