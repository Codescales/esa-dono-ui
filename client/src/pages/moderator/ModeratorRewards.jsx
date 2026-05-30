import { useEffect, useState } from 'react';
import moderatorClient from '../../api/moderator.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) { return `$${(cents / 100).toFixed(2)}`; }
const EMPTY = { title: '', description: '', type: 'DIGITAL', cost_cents: '', quantity_total: '', is_active: true, custom_type_label: '' };

export default function ModeratorRewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const reload = () => moderatorClient.get('/rewards').then(r => setRewards(r.data));
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const openCreate = () => { setForm(EMPTY); setModal('create'); setError(''); };
  const openEdit = r => { setForm({ ...r, cost_cents: String(r.cost_cents), quantity_total: r.quantity_total ?? '' }); setModal(r); setError(''); };

  const handleSave = async () => {
    setError('');
    const data = {
      ...form,
      cost_cents: parseInt(form.cost_cents),
      quantity_total: form.quantity_total ? parseInt(form.quantity_total) : null,
    };
    try {
      if (modal === 'create') await moderatorClient.post('/rewards', data);
      else await moderatorClient.put(`/rewards/${modal.id}`, data);
      await reload();
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Save failed');
    }
  };

  const handleDelete = async id => {
    if (!confirm('Delete reward?')) return;
    await moderatorClient.delete(`/rewards/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">+ New Reward</button>
      </div>

      <div className="space-y-4">
        {rewards.map(r => (
          <Card key={r.id}>
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-sm text-gray-500">{r.type} · {fmt(r.cost_cents)}</p>
                {r.quantity_total && <p className="text-xs text-gray-400">{r.quantity_claimed}/{r.quantity_total} claimed</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="text-blue-600 text-sm hover:underline">Edit</button>
                <button onClick={() => handleDelete(r.id)} className="text-red-600 text-sm hover:underline">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'New Reward' : 'Edit Reward'} onClose={() => setModal(null)}>
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
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={form.type} onChange={e => setForm(d => ({ ...d, type: e.target.value }))}>
              {['DIGITAL', 'PHYSICAL', 'SHOUTOUT', 'CUSTOM'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {form.type === 'CUSTOM' && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Custom Type Label</label>
              <input className="w-full border rounded px-3 py-2 text-sm" value={form.custom_type_label ?? ''} onChange={e => setForm(d => ({ ...d, custom_type_label: e.target.value }))} />
            </div>
          )}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Cost (cents)</label>
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.cost_cents} onChange={e => setForm(d => ({ ...d, cost_cents: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Quantity Total (blank = unlimited)</label>
            <input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.quantity_total ?? ''} onChange={e => setForm(d => ({ ...d, quantity_total: e.target.value }))} />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input type="checkbox" id="modreward_active" checked={form.is_active} onChange={e => setForm(d => ({ ...d, is_active: e.target.checked }))} />
            <label htmlFor="modreward_active" className="text-sm">Active</label>
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
