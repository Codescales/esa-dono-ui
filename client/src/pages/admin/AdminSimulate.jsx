import { useState } from 'react';
import adminClient from '../../api/admin.js';
import Card from '../../components/Card.jsx';

export default function AdminSimulate() {
  const [form, setForm] = useState({ email: '', donor_name: '', amount: '10.00', comment: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setError('');
    setResult(null);
    const cents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(cents) || cents < 100) { setError('Minimum amount is $1.00'); return; }
    setLoading(true);
    try {
      const { data } = await adminClient.post('/simulate-donation', {
        email: form.email,
        donor_name: form.donor_name || undefined,
        amount_cents: cents,
        comment: form.comment || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error ?? 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const magicLink = result ? `${window.location.origin}/wallet?token=${result.token}` : '';

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simulate Donation</h1>
      <Card className="mb-4">
        <p className="text-sm text-gray-500 mb-4">
          Creates a simulated donation without processing real money through Tiltify.
          The donor receives a magic link and balance exactly as if they donated via Tiltify.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="donor@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Donor Name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Anonymous"
              value={form.donor_name}
              onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comment</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Optional comment"
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Simulating...' : 'Simulate Donation'}
        </button>
      </Card>

      {result && (
        <Card className="border-green-300 bg-green-50">
          <h2 className="font-semibold text-green-800 mb-2">Donation created!</h2>
          <p className="text-sm text-green-700">Balance: ${(result.donor.balance_remaining / 100).toFixed(2)}</p>
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">Magic Link:</label>
            <div className="flex gap-2">
              <input
                readOnly
                className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                value={magicLink}
              />
              <button
                onClick={() => navigator.clipboard.writeText(magicLink)}
                className="px-3 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300"
              >
                Copy
              </button>
            </div>
            <a
              href={magicLink}
              target="_blank"
              rel="noreferrer"
              className="text-purple-600 text-sm underline mt-1 inline-block"
            >
              Open wallet →
            </a>
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <h3 className="font-semibold text-sm mb-2">curl alternative</h3>
        <p className="text-xs text-gray-500 mb-2">
          When TILTIFY_WEBHOOK_SECRET is unset, you can POST directly to the webhook:
        </p>
        <pre className="bg-gray-800 text-green-300 p-3 rounded text-xs overflow-x-auto">{`curl -X POST http://localhost:3001/api/webhooks/tiltify \\
  -H "Content-Type: application/json" \\
  -d '{"meta":{"event_type":"donation.completed"},"data":{"id":"test-123","donor_email":"test@example.com","donor_name":"Test","amount":{"value":"10.00"},"comment":"test"}}'`}</pre>
      </Card>
    </div>
  );
}
