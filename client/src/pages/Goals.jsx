import { useEffect, useState } from 'react';
import { getGoals, contributeGoal } from '../api/goals.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

function fmt(cents) { return `$${(cents / 100).toFixed(2)}`; }

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('5.00');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reload = () => getGoals().then(setGoals);
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const handleContribute = async () => {
    setError('');
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) { setError('Minimum contribution is $1.00'); return; }
    try {
      await contributeGoal(selected.id, cents);
      setSuccess('Contribution made!');
      reload();
      setTimeout(() => { setSelected(null); setSuccess(''); }, 1500);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to contribute.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Fund Goals</h1>
      {goals.map(g => (
        <Card key={g.id} className="mb-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-lg font-semibold">{g.title}</h2>
              {g.description && <p className="text-gray-500 text-sm">{g.description}</p>}
            </div>
            {g.is_complete ? (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">Complete!</span>
            ) : (
              <button
                onClick={() => { setSelected(g); setAmount('5.00'); setError(''); setSuccess(''); }}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >Contribute</button>
            )}
          </div>
          <ProgressBar value={g.current_cents} max={g.target_cents} />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>{fmt(g.current_cents)} raised</span>
            <span>Goal: {fmt(g.target_cents)}</span>
          </div>
        </Card>
      ))}
      {goals.length === 0 && <p className="text-gray-500">No active fund goals.</p>}

      {selected && (
        <Modal title={`Contribute to: ${selected.title}`} onClose={() => setSelected(null)}>
          <p className="text-sm text-gray-600 mb-3">{fmt(selected.current_cents)} / {fmt(selected.target_cents)} raised</p>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="1"
              className="w-full border rounded px-3 py-2 text-sm"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          {success && <p className="text-green-600 text-sm mb-2">{success}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setSelected(null)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleContribute} className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Contribute</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
