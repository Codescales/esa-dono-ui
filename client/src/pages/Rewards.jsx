import { useEffect, useState } from 'react';
import { getRewards, claimReward } from '../api/rewards.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const FIELDS = {
  PHYSICAL: [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'address', label: 'Address', required: true },
    { key: 'city', label: 'City', required: true },
    { key: 'country', label: 'Country', required: true },
  ],
  SHOUTOUT: [{ key: 'message', label: 'Shoutout Message', required: false }],
  DIGITAL: [],
};

export default function Rewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getRewards()
      .then(setRewards)
      .finally(() => setLoading(false));
  }, []);

  const openClaim = (reward) => {
    setSelected(reward);
    setFormData({});
    setError('');
    setSuccess('');
  };

  const handleClaim = async () => {
    setError('');
    try {
      await claimReward(selected.id, formData);
      setSuccess('Reward claimed successfully!');
      setTimeout(() => {
        setSelected(null);
        setSuccess('');
      }, 2000);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to claim reward.');
    }
  };

  const fields = selected
    ? (FIELDS[selected.type] ?? [
        { key: 'data', label: selected.custom_type_label ?? 'Additional Info', required: false },
      ])
    : [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Rewards</h1>
      {!localStorage.getItem('donor_token') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-yellow-800 text-sm">
          Visit your wallet link from email to claim rewards.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((r) => (
          <Card key={r.id}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{r.title}</h3>
                {r.description && <p className="text-gray-500 text-sm mt-1">{r.description}</p>}
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    {r.type}
                  </span>
                  {r.quantity_total !== null && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {r.quantity_total - r.quantity_claimed} left
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="font-bold text-purple-700">{fmt(r.cost_cents)}</p>
                <button
                  onClick={() => openClaim(r)}
                  disabled={r.quantity_total !== null && r.quantity_claimed >= r.quantity_total}
                  className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {r.quantity_total !== null && r.quantity_claimed >= r.quantity_total
                    ? 'Sold Out'
                    : 'Claim'}
                </button>
              </div>
            </div>
          </Card>
        ))}
        {rewards.length === 0 && <p className="text-gray-500 col-span-2">No rewards available.</p>}
      </div>

      {selected && (
        <Modal title={`Claim: ${selected.title}`} onClose={() => setSelected(null)}>
          {fields.map((f) => (
            <div key={f.key} className="mb-3">
              <label className="block text-sm font-medium mb-1">
                {f.label}
                {f.required && ' *'}
              </label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={formData[f.key] ?? ''}
                onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setSelected(null)} className="px-4 py-2 border rounded text-sm">
              Cancel
            </button>
            <button
              onClick={handleClaim}
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              Claim for {fmt(selected.cost_cents)}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
