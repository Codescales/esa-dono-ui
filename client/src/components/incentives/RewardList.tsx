import { useEffect, useState } from 'react';
import Card from '../Card';
import Modal from '../Modal';
import LoadingSpinner from '../LoadingSpinner';
import { useCart } from '../../context/CartContext';
import type { Reward } from '../../types';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
}

// PHYSICAL rewards intentionally collect NO fields here. Stripe Checkout
// collects the shipping address at payment time and is the single source of
// truth for it — every fulfillment path for a physical reward goes through
// Stripe (server/services/pledge.ts forces Stripe even when the wallet
// covers the full pledge, specifically to collect the address). Collecting
// an address here too would be redundant, and worse: claimRewardTx merges
// `{ ...shippingAddress, ...claimData }`, so a cart-collected address would
// silently override the one the donor actually confirmed at payment.
const FIELDS: Record<string, FieldDef[]> = {
  SHOUTOUT: [{ key: 'message', label: 'Shoutout Message', required: false }],
  PHYSICAL: [],
  DIGITAL: [],
};

export default function RewardList() {
  const { rewards, loading, cart, addToCart, removeFromCart, markVisited } = useCart();
  const [claiming, setClaiming] = useState<Reward | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    markVisited('rewards');
  }, [markVisited]);

  if (loading) return <LoadingSpinner />;

  const inCart = (id: string) => cart.some((i) => i.kind === 'REWARD' && i.target_id === id);

  const fieldsFor = (reward: Reward): FieldDef[] =>
    FIELDS[reward.type] ?? [
      { key: 'data', label: reward.custom_type_label ?? 'Additional Info', required: false },
    ];

  const commitAdd = (reward: Reward, data: Record<string, string>) => {
    addToCart({
      kind: 'REWARD',
      target_id: reward.id,
      amount_cents: reward.cost_cents,
      label: reward.title,
      data,
    });
  };

  const handleAddClick = (reward: Reward) => {
    const fields = fieldsFor(reward);
    if (fields.length === 0) {
      commitAdd(reward, {});
      return;
    }
    setClaiming(reward);
    setFormData({});
  };

  const handleModalSubmit = () => {
    if (!claiming) return;
    commitAdd(claiming, formData);
    setClaiming(null);
  };

  return (
    <div>
      <h2 className="font-display text-3xl lowercase text-off-white mb-2">rewards</h2>
      <p className="font-body text-sm text-off-white/55 mb-6">
        Add rewards to your cart. Each reward costs a fixed amount, applied when you check out.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((r) => {
          const soldOut = r.quantity_total !== null && r.quantity_claimed >= r.quantity_total;
          return (
            <Card key={r.id} className={soldOut ? 'opacity-50' : ''}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-data font-bold text-lg text-off-white">{r.title}</h3>
                  {r.description && (
                    <p className="font-body text-sm text-off-white/55 mt-1">{r.description}</p>
                  )}
                  <span
                    className="inline-block font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm mt-2"
                    style={{ background: 'rgba(115,78,158,.3)', color: 'var(--off-white)' }}
                  >
                    {r.type}
                  </span>
                  {r.quantity_total !== null && (
                    <span className="font-mono text-[10px] text-off-white/55 ml-2">
                      {r.quantity_total - r.quantity_claimed} left
                    </span>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-display text-2xl text-d-yellow">{fmt(r.cost_cents)}</p>
                  {inCart(r.id) ? (
                    <button
                      onClick={() => removeFromCart('REWARD', r.id)}
                      className="btrl-button btrl-button-outline mt-2 text-sm"
                    >
                      remove
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddClick(r)}
                      disabled={soldOut}
                      className="btrl-button mt-2 text-sm"
                    >
                      {soldOut ? 'sold out' : 'add'}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {rewards.length === 0 && (
          <p className="font-body text-sm text-off-white/55 col-span-2">No rewards available.</p>
        )}
      </div>

      {claiming && (
        <Modal title={`add: ${claiming.title}`} onClose={() => setClaiming(null)}>
          <p className="font-body text-sm text-off-white/55 mb-3">
            This will be added to your cart for{' '}
            <strong className="text-d-yellow">{fmt(claiming.cost_cents)}</strong>.
          </p>
          {fieldsFor(claiming).map((f) => (
            <div className="mb-3" key={f.key}>
              <label className="block font-data font-bold text-sm mb-1 text-off-white">
                {f.label}{' '}
                {!f.required && <span className="text-off-white/40 font-normal">(optional)</span>}
              </label>
              <input
                className="w-full px-3 py-2 text-sm"
                value={formData[f.key] || ''}
                onChange={(e) => setFormData((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button onClick={() => setClaiming(null)} className="btrl-button btrl-button-outline">
              cancel
            </button>
            <button onClick={handleModalSubmit} className="btrl-button">
              add to cart
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
