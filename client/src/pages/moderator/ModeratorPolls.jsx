import { useEffect, useState } from 'react';
import moderatorClient from '../../api/moderator.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
const EMPTY = {
  title: '',
  description: '',
  is_active: true,
  ends_at: '',
  allow_custom_entries: false,
  max_entry_chars: '',
};

export default function ModeratorPolls() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [newOption, setNewOption] = useState('');
  const [error, setError] = useState('');
  const [entriesPanel, setEntriesPanel] = useState(null); // poll id for entries sub-view
  const [entries, setEntries] = useState([]);

  const reload = () => moderatorClient.get('/polls').then((r) => setPolls(r.data));
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
    setError('');
  };
  const openEdit = (p) => {
    setForm({
      ...p,
      ends_at: p.ends_at ? p.ends_at.slice(0, 16) : '',
      max_entry_chars: p.max_entry_chars ?? '',
    });
    setModal(p);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    try {
      const data = {
        ...form,
        ends_at: form.ends_at || null,
        max_entry_chars: form.max_entry_chars ? parseInt(form.max_entry_chars) : null,
        allow_custom_entries: form.allow_custom_entries || false,
      };
      if (modal === 'create') {
        await moderatorClient.post('/polls', data);
      } else {
        await moderatorClient.put(`/polls/${modal.id}`, data);
      }
      await reload();
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete poll?')) return;
    await moderatorClient.delete(`/polls/${id}`);
    await reload();
  };

  const addOption = async (pollId) => {
    if (!newOption.trim()) return;
    await moderatorClient.post(`/polls/${pollId}/options`, { label: newOption.trim() });
    setNewOption('');
    await reload();
  };

  const deleteOption = async (id) => {
    await moderatorClient.delete(`/polls/options/${id}`);
    await reload();
  };

  const loadEntries = async (pollId) => {
    const { data } = await moderatorClient.get(`/polls/${pollId}/custom-entries`);
    setEntries(data);
    setEntriesPanel(pollId);
  };

  const handleApproveReject = async (entryId, status) => {
    await moderatorClient.patch(`/polls/custom-entries/${entryId}`, { status });
    await reload();
    // Reload the entries list
    if (entriesPanel) {
      const { data } = await moderatorClient.get(`/polls/${entriesPanel}/custom-entries`);
      setEntries(data);
    }
  };

  const pendingCount = (poll) =>
    poll.custom_entries?.filter((e) => e.status === 'PENDING').length || 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Polls</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          + New Poll
        </button>
      </div>

      <div className="space-y-4">
        {polls.map((poll) => (
          <Card key={poll.id}>
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{poll.title}</h2>
                {poll.description && <p className="text-gray-500 text-sm">{poll.description}</p>}
                <p className="text-xs text-gray-400">
                  Total votes: {fmt(poll.total_votes_cents)}
                  {poll.allow_custom_entries && ' · Custom entries allowed'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(poll)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(poll.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="mt-3 space-y-1">
              {poll.options.map((opt) => (
                <div
                  key={opt.id}
                  className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded"
                >
                  <span>
                    {opt.label} ({fmt(opt.votes_cents)}){opt.custom_entry_id ? ' · custom' : ''}
                  </span>
                  <button
                    onClick={() => deleteOption(opt.id)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  placeholder="New option..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOption(poll.id)}
                />
                <button
                  onClick={() => addOption(poll.id)}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Pending entries */}
            {poll.allow_custom_entries && (
              <button
                onClick={() => loadEntries(poll.id)}
                className="mt-3 text-sm text-purple-600 hover:underline"
              >
                {pendingCount(poll) > 0
                  ? `${pendingCount(poll)} Pending Entries`
                  : 'Custom Entries'}
              </button>
            )}

            {/* Entries sub-panel */}
            {entriesPanel === poll.id && (
              <div className="mt-3 border-t pt-3">
                <h4 className="text-sm font-semibold mb-2">Custom Entries</h4>
                {entries.length === 0 ? (
                  <p className="text-gray-400 text-xs">No entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <div
                        key={e.id}
                        className={`flex justify-between items-center text-sm p-2 rounded ${e.status === 'PENDING' ? 'bg-yellow-50' : e.status === 'APPROVED' ? 'bg-green-50' : 'bg-red-50'}`}
                      >
                        <div>
                          <span
                            className={e.status === 'REJECTED' ? 'line-through text-gray-400' : ''}
                          >
                            {e.label}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">{e.donor?.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${e.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : e.status === 'APPROVED' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}
                          >
                            {e.status}
                          </span>
                          {e.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveReject(e.id, 'APPROVED')}
                                className="text-green-600 text-xs hover:underline"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(e.id, 'REJECTED')}
                                className="text-red-600 text-xs hover:underline"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <Modal title={modal === 'create' ? 'New Poll' : 'Edit Poll'} onClose={() => setModal(null)}>
          {[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
          ].map((f) => (
            <div key={f.key} className="mb-3">
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Ends At (optional)</label>
            <input
              type="datetime-local"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.ends_at ?? ''}
              onChange={(e) => setForm((d) => ({ ...d, ends_at: e.target.value }))}
            />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="modpoll_active"
              checked={form.is_active}
              onChange={(e) => setForm((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <label htmlFor="modpoll_active" className="text-sm">
              Active
            </label>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="modpoll_custom"
              checked={form.allow_custom_entries || false}
              onChange={(e) => setForm((d) => ({ ...d, allow_custom_entries: e.target.checked }))}
            />
            <label htmlFor="modpoll_custom" className="text-sm">
              Allow custom entries
            </label>
          </div>
          {form.allow_custom_entries && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Max entry characters (optional)
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.max_entry_chars ?? ''}
                onChange={(e) => setForm((d) => ({ ...d, max_entry_chars: e.target.value }))}
                placeholder="No limit"
              />
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
