import { useEffect, useState } from 'react';
import adminClient from '../../api/admin.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const EMPTY = {
  title: '',
  description: '',
  type: 'DIGITAL',
  cost_cents: 100,
  quantity_total: '',
  is_active: true,
  custom_type_label: '',
};

export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | reward object
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const reload = () => adminClient.get('/rewards').then((r) => setRewards(r.data));
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
    setError('');
  };
  const openEdit = (r) => {
    setForm({ ...r, cost_cents: r.cost_cents, quantity_total: r.quantity_total ?? '' });
    setModal(r);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    const data = {
      ...form,
      cost_cents: parseInt(form.cost_cents),
      quantity_total: form.quantity_total === '' ? null : parseInt(form.quantity_total),
    };
    try {
      if (modal === 'create') {
        await adminClient.post('/rewards', data);
      } else {
        await adminClient.put(`/rewards/${modal.id}`, data);
      }
      await reload();
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reward?')) return;
    await adminClient.delete(`/rewards/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rewards</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + New Reward
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white rounded shadow text-sm">
          <thead className="bg-gray-100">
            <tr>
              {['Title', 'Type', 'Cost', 'Qty', 'Active', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-medium">{r.title}</td>
                <td className="px-4 py-2">
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-2">{fmt(r.cost_cents)}</td>
                <td className="px-4 py-2">
                  {r.quantity_total ?? '∞'} ({r.quantity_claimed} claimed)
                </td>
                <td className="px-4 py-2">{r.is_active ? '✓' : '✗'}</td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'New Reward' : 'Edit Reward'}
          onClose={() => setModal(null)}
        >
          {[
            { key: 'title', label: 'Title', type: 'text' },
            { key: 'description', label: 'Description', type: 'text' },
            { key: 'cost_cents', label: 'Cost (cents)', type: 'number' },
            { key: 'quantity_total', label: 'Quantity (blank=unlimited)', type: 'number' },
            { key: 'custom_type_label', label: 'Custom Label (CUSTOM type)', type: 'text' },
          ].map((f) => (
            <div key={f.key} className="mb-3">
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                type={f.type}
                className="w-full border rounded px-3 py-2 text-sm"
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((d) => ({ ...d, type: e.target.value }))}
            >
              {['DIGITAL', 'PHYSICAL', 'SHOUTOUT', 'CUSTOM'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active" className="text-sm">
              Active
            </label>
          </div>
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
