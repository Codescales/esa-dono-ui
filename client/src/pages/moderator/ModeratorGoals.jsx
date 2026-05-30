import { useEffect, useState } from 'react';
import moderatorClient from '../../api/moderator.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ProgressBar from '../../components/ProgressBar.jsx';

function fmt(cents) { return `$${(cents / 100).toFixed(2)}`; }
const EMPTY = { title: '', description: '', target_cents: '', is_active: true };

export default function ModeratorGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const reload = () => moderatorClient.get('/goals').then(r => setGoals(r.data));
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const openCreate = () => { setForm(EMPTY); setModal('create'); setError(''); };
  const openEdit = g => { setForm({ ...g, target_cents: String(g.target_cents) }); setModal(g); setError(''); };

  const handleSave = async () => {
    setError('');
    const data = { ...form, target_cents: parseInt(form.target_cents) };
    try {
      if (modal === 'create') await moderatorClient.post('/goals', data);
      else await moderatorClient.put(`/goals/${modal.id}`, data);
      await reload();
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Save failed');
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete goal?')) return;
    await moderatorClient.delete(`/goals/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Fund Goals</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">+ New Goal</button>
      </div>

      <div className="space-y-4">
        {goals.map(g => (
          <Card key={g.id}>
            <div className="flex justify-between">
              <div className="flex-1">
                <h2 className="font-semibold">{g.title}</h2>
                <p className="text-sm text-gray-500">{fmt(g.current_cents)} / {fmt(g.target_cents)} {g.is_complete && '· Complete'}</p>
                <ProgressBar value={g.current_cents} max={g.target_cents} />
              </div>
              <div className="flex gap-2 ml-4">
                <button onClick={() => openEdit(g)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(g.id)} className="text-red-600 text-sm hover:underline">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Goal' : 'Edit Goal'} onClose={() => setModal(null)}>
          {[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
          ].map(f => (
            <div key={f.key} className="mb-3">
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={form[f.key] ?? ''} onChange={e => setForm(d => ({ ...d, [f.key]: e.target.value }))} />
            </div>
          ))}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Target (cents)</label>
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.target_cents} onChange={e => setForm(d => ({ ...d, target_cents: e.target.value }))} />
          </div>
          {modal !== 'create' && (
            <div className="mb-3 flex items-center gap-2">
              <input type="checkbox" id="modgoal_complete" checked={form.is_complete} onChange={e => setForm(d => ({ ...d, is_complete: e.target.checked }))} />
              <label htmlFor="modgoal_complete" className="text-sm">Complete</label>
            </div>
          )}
          <div className="mb-3 flex items-center gap-2">
            <input type="checkbox" id="modgoal_active" checked={form.is_active} onChange={e => setForm(d => ({ ...d, is_active: e.target.checked }))} />
            <label htmlFor="modgoal_active" className="text-sm">Active</label>
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 border rounded text-sm">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
