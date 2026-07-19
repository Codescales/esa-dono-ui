import { useEffect, useState } from 'react';
import moderatorClient from '../../api/moderator.js';
import Card from '../../components/Card.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ModeratorClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = () => moderatorClient.get('/claims').then((r) => setClaims(r.data));
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'PENDING' ? 'FULFILLED' : 'PENDING';
    await moderatorClient.patch(`/claims/${id}`, { status: newStatus });
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Claims</h1>

      <div className="space-y-4">
        {claims.map((c) => (
          <Card key={c.id}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-sm">{c.reward?.title}</h3>
                <p className="text-xs text-gray-500">Donor: {c.donor?.email}</p>
                <p className="text-xs text-gray-400">Type: {c.reward?.type}</p>
                {c.claim_data && (
                  <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded max-w-md overflow-x-auto">
                    {JSON.stringify(c.claim_data, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${c.status === 'FULFILLED' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}
                >
                  {c.status}
                </span>
                <button
                  onClick={() => toggleStatus(c.id, c.status)}
                  className={`text-xs px-2 py-1 rounded ${c.status === 'PENDING' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                >
                  {c.status === 'PENDING' ? 'Mark Fulfilled' : 'Mark Pending'}
                </button>
              </div>
            </div>
          </Card>
        ))}
        {claims.length === 0 && <p className="text-gray-400 text-sm">No claims yet.</p>}
      </div>
    </div>
  );
}
