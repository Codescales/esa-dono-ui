import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDonor } from '../api/donor.js';
import { extractToken, setDonorToken, clearDonorToken } from '../utils/authToken.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Card from '../components/Card.jsx';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function WalletLogin({ message, onLogin }) {
  const [input, setInput] = useState('');
  const [formError, setFormError] = useState('');

  const submit = () => {
    const token = extractToken(input);
    if (!token) {
      setFormError('Paste the full magic link from your email, or paste just the token value.');
      return;
    }
    setFormError('');
    onLogin(token);
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Access Your Wallet</h1>
      <Card>
        {message && <p className="text-red-600 text-sm mb-4">{message}</p>}
        <div className="space-y-3 text-sm text-gray-500 mb-5">
          <p>
            Your wallet is unlocked by the magic link emailed after each donation.
            There are no passwords or account signups.
          </p>
          <p>
            If your link expired or stopped working, use the newest donation email.
            Each new donation rotates your wallet link, so older emails may no longer work.
          </p>
          <p>
            Paste either the entire email link or just the token below.
          </p>
        </div>

        <label className="block text-sm font-medium mb-1">Magic link or token</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm mb-2"
          placeholder="https://.../wallet?token=..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}
        <button onClick={submit} className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
          Open Wallet
        </button>
      </Card>
    </div>
  );
}

export default function MyWallet() {
  const [searchParams] = useSearchParams();
  const [donor, setDonor] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDonor = async () => {
    const stored = localStorage.getItem('donor_token');
    if (!stored) {
      setDonor(null);
      setError('No wallet token found. Check your donation email for your magic link.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getDonor();
      setDonor(data);
      setError(null);
    } catch {
      setDonor(null);
      setError('Invalid or expired wallet token. Paste the newest magic link from your donation email.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setDonorToken(token);
    loadDonor();
  }, []);

  const handleLogin = (token) => {
    setDonorToken(token);
    loadDonor();
  };

  const handleLogout = () => {
    clearDonorToken();
    setDonor(null);
    setError('You have logged out. Paste your magic link to access your wallet again.');
  };

  if (loading) return <LoadingSpinner />;
  if (!donor) return <WalletLogin message={error} onLogin={handleLogin} />;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Wallet</h1>
        <button onClick={handleLogout} className="text-sm text-purple-200 hover:text-white">Logout</button>
      </div>
      <Card className="mb-6">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">Logged in as</p>
            <p className="font-medium break-all">{donor.email}</p>
            {donor.is_moderator && <p className="text-xs text-orange-300 mt-1">Moderator access enabled</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-sm">Available Balance</p>
            <p className="text-2xl font-bold text-purple-700">{fmt(donor.balance_remaining)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t flex gap-8">
          <div>
            <p className="text-gray-500 text-sm">Total Donated</p>
            <p className="font-medium">{fmt(donor.total_donated)}</p>
          </div>
        </div>
      </Card>

      <h2 className="text-xl font-semibold mb-3">Donation History</h2>
      {donor.donations.length === 0 ? (
        <p className="text-gray-500">No donations yet.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {donor.donations.map(d => (
            <Card key={d.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{fmt(d.amount_cents)}</p>
                {d.comment && <p className="text-gray-500 text-sm">{d.comment}</p>}
              </div>
              <p className="text-gray-400 text-sm">{new Date(d.created_at).toLocaleDateString()}</p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">My Claims</h2>
      {donor.reward_claims.length === 0 ? (
        <p className="text-gray-500">No reward claims yet.</p>
      ) : (
        <div className="space-y-2">
          {donor.reward_claims.map(c => (
            <Card key={c.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{c.reward.title}</p>
                <p className="text-sm text-gray-500">{fmt(c.reward.cost_cents)}</p>
              </div>
              <span className={`text-sm font-semibold px-2 py-1 rounded ${c.status === 'FULFILLED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {c.status}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
