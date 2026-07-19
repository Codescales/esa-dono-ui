import { useEffect, useState } from 'react';
import {
  getDonors,
  getDonorWallet,
  revokeDonorToken,
  regenerateDonorToken,
  toggleDonorFreeze,
  adjustDonorBalance,
  reverseDonorSpend,
} from '../../api/admin.js';
import Card from '../../components/Card.jsx';
import Modal from '../../components/Modal.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminDonors() {
  const [search, setSearch] = useState('');
  const [donors, setDonors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const loadDonors = async (q = '') => {
    setLoading(true);
    try {
      const data = await getDonors(q);
      setDonors(data.donors);
      setTotal(data.total);
    } catch {
      setError('Failed to load donors');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDonors();
  }, []);

  const searchDonors = () => {
    loadDonors(search);
  };
  const clearSearch = () => {
    setSearch('');
    loadDonors('');
  };

  const openWallet = async (donor) => {
    setSelected(donor);
    setWalletLoading(true);
    setWallet(null);
    try {
      const data = await getDonorWallet(donor.id);
      setWallet(data);
    } catch {
      setError('Failed to load wallet');
    }
    setWalletLoading(false);
  };

  const closeWallet = () => {
    setSelected(null);
    setWallet(null);
  };

  const handleFreeze = async () => {
    await toggleDonorFreeze(selected.id, !wallet.is_frozen);
    openWallet({ id: selected.id });
  };

  const handleRevoke = async () => {
    await revokeDonorToken(selected.id);
    openWallet({ id: selected.id });
  };

  const handleRegen = async () => {
    await regenerateDonorToken(selected.id);
    openWallet({ id: selected.id });
  };

  const handleAdjust = async (amount_cents, reason, type) => {
    await adjustDonorBalance(selected.id, amount_cents, reason, type);
    setModal(null);
    openWallet({ id: selected.id });
  };

  const handleReverse = async (spend_type, spend_id) => {
    if (!window.confirm(`Reverse this ${spend_type}? This restores the balance.`)) return;
    await reverseDonorSpend(selected.id, spend_type, spend_id);
    openWallet({ id: selected.id });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Donors</h1>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      <div className="flex gap-3 mb-6">
        <input
          className="border rounded px-3 py-2 text-sm flex-1"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchDonors()}
        />
        <button
          onClick={searchDonors}
          className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700"
        >
          Search
        </button>
        {search && (
          <button onClick={clearSearch} className="text-gray-500 text-sm hover:text-gray-700">
            Clear
          </button>
        )}
        <span className="text-sm text-gray-500 self-center">
          {total} donor{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selected ? 'hidden lg:block' : ''} lg:col-span-1`}>
            <div className="space-y-2">
              {donors.length === 0 && <p className="text-gray-500 text-sm">No donors found.</p>}
              {donors.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openWallet(d)}
                  className={`w-full text-left esa-panel rounded-lg p-3 hover:bg-opacity-80 transition ${selected?.id === d.id ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <p className="font-medium text-sm truncate">{d.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {fmt(d.total_donated)} donated · {fmt(d.balance_remaining)} balance
                  </p>
                  {d.is_frozen && <span className="text-xs text-red-400 font-medium">FROZEN</span>}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{wallet?.email || 'Loading...'}</h2>
                <button
                  onClick={closeWallet}
                  className="text-sm text-gray-500 hover:text-gray-700 lg:hidden"
                >
                  Close
                </button>
              </div>

              {walletLoading ? (
                <LoadingSpinner />
              ) : wallet ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="text-center">
                      <p className="text-xs text-gray-500">Total Donated</p>
                      <p className="text-lg font-bold">{fmt(wallet.total_donated)}</p>
                    </Card>
                    <Card className="text-center">
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="text-lg font-bold">{fmt(wallet.balance_remaining)}</p>
                    </Card>
                    <Card className="text-center">
                      <p className="text-xs text-gray-500">Moderator</p>
                      <p className="text-lg font-bold">{wallet.is_moderator ? 'Yes' : 'No'}</p>
                    </Card>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleFreeze}
                      className={`px-3 py-1.5 rounded text-sm ${wallet.is_frozen ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                    >
                      {wallet.is_frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                    <button
                      onClick={handleRevoke}
                      className="px-3 py-1.5 rounded text-sm bg-gray-600 text-white hover:bg-gray-700"
                    >
                      Revoke Token
                    </button>
                    <button
                      onClick={handleRegen}
                      className="px-3 py-1.5 rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Regenerate Token
                    </button>
                    <button
                      onClick={() => setModal({ type: 'adjust' })}
                      className="px-3 py-1.5 rounded text-sm bg-yellow-600 text-white hover:bg-yellow-700"
                    >
                      Adjust Balance
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg mt-6 mb-3">Spend History</h3>

                    {wallet.reward_claims?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Reward Claims</h4>
                        <div className="space-y-2">
                          {wallet.reward_claims.map((c) => (
                            <div
                              key={c.id}
                              className="esa-panel rounded-lg p-3 flex justify-between items-center text-sm"
                            >
                              <div>
                                <span className="font-medium">{c.reward?.title || 'Unknown'}</span>
                                <span
                                  className={`ml-2 text-xs px-1.5 py-0.5 rounded ${c.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : c.status === 'REVERSED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}
                                >
                                  {c.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>-{fmt(c.reward?.cost_cents || 0)}</span>
                                {c.status !== 'REVERSED' && (
                                  <button
                                    onClick={() => handleReverse('claim', c.id)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Reverse
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {wallet.poll_votes?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Poll Votes</h4>
                        <div className="space-y-2">
                          {wallet.poll_votes.map((v) => (
                            <div
                              key={v.id}
                              className="esa-panel rounded-lg p-3 flex justify-between items-center text-sm"
                            >
                              <div>
                                <span>Vote · {fmt(v.amount_cents)}</span>
                                {v.reversed_at && (
                                  <span className="ml-2 text-xs text-red-600">(REVERSED)</span>
                                )}
                              </div>
                              {!v.reversed_at && (
                                <button
                                  onClick={() => handleReverse('vote', v.id)}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Reverse
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {wallet.fund_contributions?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">
                          Fund Contributions
                        </h4>
                        <div className="space-y-2">
                          {wallet.fund_contributions.map((c) => (
                            <div
                              key={c.id}
                              className="esa-panel rounded-lg p-3 flex justify-between items-center text-sm"
                            >
                              <div>
                                <span>
                                  {c.goal?.title || 'Unknown'} · {fmt(c.amount_cents)}
                                </span>
                                {c.reversed_at && (
                                  <span className="ml-2 text-xs text-red-600">(REVERSED)</span>
                                )}
                              </div>
                              {!c.reversed_at && (
                                <button
                                  onClick={() => handleReverse('contribution', c.id)}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Reverse
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!wallet.reward_claims?.length &&
                      !wallet.poll_votes?.length &&
                      !wallet.fund_contributions?.length && (
                        <p className="text-sm text-gray-500">No spend history.</p>
                      )}
                  </div>

                  {wallet.balance_adjustments?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mt-6 mb-3">Balance Adjustments</h3>
                      <div className="space-y-2">
                        {wallet.balance_adjustments.map((a) => (
                          <div
                            key={a.id}
                            className="esa-panel rounded-lg p-3 flex justify-between items-center text-sm"
                          >
                            <div>
                              <span
                                className={`font-medium ${a.amount_cents > 0 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {a.amount_cents > 0 ? '+' : ''}
                                {fmt(a.amount_cents)}
                              </span>
                              <span className="ml-2 text-gray-500">{a.type}</span>
                              {a.reason && <span className="ml-2 text-gray-400">— {a.reason}</span>}
                            </div>
                            <span className="text-xs text-gray-400">
                              Balance: {fmt(a.balance_after_cents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {modal?.type === 'adjust' && (
        <Modal title="Adjust Balance" onClose={() => setModal(null)}>
          <AdjustBalanceForm onSubmit={handleAdjust} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

function AdjustBalanceForm({ onSubmit, onCancel }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('MANUAL');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    const cents = Math.round(parseFloat(amount || '0') * 100);
    if (cents === 0) {
      setErr('Enter a non-zero amount');
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      await onSubmit(cents, reason || null, type);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to adjust balance');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="block font-medium mb-1">Amount (dollars, negative for deduction)</label>
        <input
          className="border rounded px-3 py-2 w-full"
          type="number"
          step="0.01"
          placeholder="e.g. 10.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Type</label>
        <select
          className="border rounded px-3 py-2 w-full"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="MANUAL">Manual</option>
          <option value="REFUND">Refund</option>
          <option value="FREEZE_ZERO">Freeze Zero</option>
          <option value="CHARGEBACK">Chargeback</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-1">Reason (optional)</label>
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Why?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
