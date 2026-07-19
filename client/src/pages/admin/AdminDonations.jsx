import { useEffect, useState } from 'react';
import adminClient from '../../api/admin.js';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminDonations() {
  const [donations, setDonations] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('donations');

  const reloadClaims = () => adminClient.get('/claims').then((r) => setClaims(r.data));
  const reloadDonations = () => adminClient.get('/donations').then((r) => setDonations(r.data));

  useEffect(() => {
    Promise.all([reloadDonations(), reloadClaims()]).finally(() => setLoading(false));
  }, []);

  const toggleFulfilled = async (claim) => {
    const status = claim.status === 'FULFILLED' ? 'PENDING' : 'FULFILLED';
    await adminClient.patch(`/claims/${claim.id}`, { status });
    await reloadClaims();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Donations & Claims</h1>
      <div className="flex gap-2 mb-4">
        {['donations', 'claims'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium ${tab === t ? 'bg-purple-600 text-white' : 'bg-white border'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'donations' && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead className="bg-gray-100">
              <tr>
                {['Donor', 'Email', 'Amount', 'Comment', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">{d.donor_name ?? '-'}</td>
                  <td className="px-4 py-2">{d.donor?.email ?? '-'}</td>
                  <td className="px-4 py-2 font-medium">{fmt(d.amount_cents)}</td>
                  <td className="px-4 py-2 text-gray-500">{d.comment ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'claims' && (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded shadow text-sm">
            <thead className="bg-gray-100">
              <tr>
                {['Donor', 'Reward', 'Status', 'Data', 'Date', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-2">{c.donor?.email ?? '-'}</td>
                  <td className="px-4 py-2">{c.reward?.title ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 max-w-xs truncate">
                    {c.claim_data ? JSON.stringify(c.claim_data) : '-'}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleFulfilled(c)}
                      className={`text-xs px-2 py-1 rounded ${c.status === 'FULFILLED' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {c.status === 'FULFILLED' ? 'Mark Pending' : 'Mark Fulfilled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
