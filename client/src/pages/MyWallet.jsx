import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDonor } from '../api/donor.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Card from '../components/Card.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MyWallet() {
  const [searchParams] = useSearchParams();
  const [donor, setDonor] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) localStorage.setItem('donor_token', token);
    const stored = localStorage.getItem('donor_token');
    if (!stored) {
      setError('No wallet token found. Check your email for a magic link.');
      setLoading(false);
      return;
    }
    getDonor().then(setDonor).catch(() => setError('Invalid or expired token.')).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">My Wallet</h1>
      <Card className="mb-6">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="font-medium">{donor.email}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Available Balance</p>
            <p className="text-2xl font-bold text-purple-700">{fmt(donor.balance_remaining)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex gap-8">
          <div>
            <p className="text-gray-500 text-sm">Total Donated</p>
            <p className="font-medium">{fmt(donor.total_donated)}</p>
          </div>
        </div>
      </Card>

      <h2 className="text-xl font-semibold mb-3">Donation History</h2>
      {donor.donations.length === 0 ? (
        <p className="text-gray-500">No donations yet.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {donor.donations.map(d => (
            <Card key={d.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{fmt(d.amount_cents)}</p>
                {d.comment && <p className="text-gray-500 text-sm">{d.comment}</p>}
              </div>
              <p className="text-gray-400 text-sm">{new Date(d.created_at).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">My Claims</h2>
      {donor.reward_claims.length === 0 ? (
        <p className="text-gray-500">No reward claims yet.</p>
      ) : (
        <div className="space-y-2">
          {donor.reward_claims.map(c => (
            <Card key={c.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{c.reward.title}</p>
                <p className="text-sm text-gray-500">{fmt(c.reward.cost_cents)}</p>
              </div>
              <span className={`text-sm font-semibold px-2 py-1 rounded ${c.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {c.status}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
