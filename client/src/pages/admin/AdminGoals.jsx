import { useEffect, useState } from 'react';
import adminClient from '../../api/admin.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
const EMPTY = { title: '', description: '', target_cents: 1000, is_active: true };

export default function AdminGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const reload = () => adminClient.get('/goals').then((r) => setGoals(r.data));
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
    setError('');
  };
  const openEdit = (g) => {
    setForm(g);
    setModal(g);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    try {
      const data = { ...form, target_cents: parseInt(form.target_cents) };
      if (modal === 'create') {
        await adminClient.post('/goals', data);
      } else {
        await adminClient.put(`/goals/${modal.id}`, data);
      }
      await reload();
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete goal?')) return;
    await adminClient.delete(`/goals/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fund Goals</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + New Goal
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((g) => (
          <Card key={g.id}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="font-semibold">{g.title}</h2>
                {g.description && <p className="text-gray-500 text-sm">{g.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {g.is_complete && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                    Complete
                  </span>
                )}
                <button
                  onClick={() => openEdit(g)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
            <ProgressBar value={g.current_cents} max={g.target_cents} />
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{fmt(g.current_cents)}</span>
              <span>{fmt(g.target_cents)}</span>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Goal' : 'Edit Goal'} onClose={() => setModal(null)}>
          {[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
            { key: 'target_cents', label: 'Target (cents)', type: 'number' },
          ].map((f) => (
            <div key={f.key} className="mb-3">
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                className="w-full border rounded px-3 py-2 text-sm"
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="goal_active"
              checked={form.is_active}
              onChange={(e) => setForm((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <label htmlFor="goal_active" className="text-sm">
              Active
            </label>
          </div>
          {modal !== 'create' && (
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="goal_complete"
                checked={form.is_complete ?? false}
                onChange={(e) => setForm((d) => ({ ...d, is_complete: e.target.checked }))}
              />
              <label htmlFor="goal_complete" className="text-sm">
                Mark Complete
              </label>
            </div>
          )}
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 border rounded text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
