import { useEffect, useState } from 'react';
import adminClient from '../../api/admin';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { apiErrorMessage, type Stream } from '../../types';

interface StreamForm {
  id?: string;
  name: string;
  is_active: boolean;
}

const EMPTY: StreamForm = { name: '', is_active: true };

type StreamModal = 'create' | Stream | null;

export default function AdminStreams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<StreamModal>(null);
  const [form, setForm] = useState<StreamForm>(EMPTY);
  const [error, setError] = useState('');

  const reload = () => adminClient.get('/streams').then((r) => setStreams(r.data));
  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(EMPTY);
    setModal('create');
    setError('');
  };
  const openEdit = (s: Stream) => {
    setForm({ ...s });
    setModal(s);
    setError('');
  };

  const handleSave = async () => {
    setError('');
    try {
      if (modal === 'create') await adminClient.post('/streams', form);
      else if (modal) await adminClient.put(`/streams/${modal.id}`, form);
      await reload();
      setModal(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'Save failed'));
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this stream? Existing incentives/donations keep referencing it.'))
      return;
    await adminClient.delete(`/streams/${id}`);
    await reload();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-4xl lowercase">streams</h1>
        <button onClick={openCreate} className="btrl-button">
          + new stream
        </button>
      </div>

      <p className="font-body text-sm text-off-white/55 mb-6">
        Every donation is routed to exactly one stream. Rewards, polls, and fund goals can be tied
        to a specific stream or left shared (available to any stream). Deactivating a stream hides
        it from the /donate picker without deleting its history.
      </p>

      <div className="space-y-3">
        {streams.map((s) => (
          <Card key={s.id}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-data font-bold text-lg text-off-white">{s.name}</h2>
                <p className="font-data text-xs text-off-white/55">
                  {s.is_active ? 'active' : 'inactive'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="font-mono text-[10px] tracking-wider uppercase text-d-yellow hover:text-off-white"
                >
                  edit
                </button>
                {s.is_active && (
                  <button
                    onClick={() => handleDeactivate(s.id)}
                    className="font-mono text-[10px] tracking-wider uppercase hover:text-off-white"
                    style={{ color: 'var(--red)' }}
                  >
                    deactivate
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {streams.length === 0 && (
          <p className="font-body text-sm text-off-white/55">No streams yet.</p>
        )}
      </div>

      {modal && (
        <Modal
          title={modal === 'create' ? 'new stream' : 'edit stream'}
          onClose={() => setModal(null)}
        >
          <div className="mb-3">
            <label className="block font-data font-bold text-sm mb-1 text-off-white">name</label>
            <input
              className="w-full px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="stream_active"
              checked={form.is_active}
              onChange={(e) => setForm((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <label htmlFor="stream_active" className="font-data text-sm text-off-white">
              active
            </label>
          </div>
          {error && (
            <p className="text-sm mb-2" style={{ color: 'var(--red)' }}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(null)} className="btrl-button btrl-button-outline">
              cancel
            </button>
            <button onClick={handleSave} className="btrl-button">
              save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
