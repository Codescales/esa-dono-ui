import { useEffect, useRef, useState } from 'react';
import { useCart, type CartIssue } from '../context/CartContext';
import { getDonor } from '../api/donor';
import { sanitizeMoneyInput } from '../utils/money';
import type { DonorWallet } from '../types';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  rewards: 'rewards',
  polls: 'polls',
  goals: 'fund goals',
};

const KIND_LABELS: Record<string, string> = {
  REWARD: 'reward',
  POLL_VOTE: 'poll vote',
  POLL_CUSTOM: 'your own option',
  GOAL: 'goal',
};

type Phase = 'idle' | 'checking' | 'nudge' | 'issues';

export default function CartDrawer() {
  const {
    cart,
    removeFromCart,
    topUp,
    setTopUp,
    topUpCents,
    email,
    setEmail,
    comment,
    setComment,
    totalCents,
    unvisitedAvailableCategories,
    drawerOpen,
    closeDrawer,
    submitting,
    checkoutError,
    setCheckoutError,
    checkout,
    revalidateCart,
  } = useCart();

  const [donor, setDonor] = useState<DonorWallet | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [issues, setIssues] = useState<CartIssue[]>([]);
  const [nudgeAcknowledged, setNudgeAcknowledged] = useState(false);

  // Brief "juice" pulse on the total whenever it changes, so the drawer
  // itself gives tactile feedback when items are added/removed/edited, not
  // just a static number update. Skips the initial render.
  const [totalPulse, setTotalPulse] = useState(false);
  const prevTotal = useRef<number | null>(null);
  useEffect(() => {
    if (prevTotal.current === null) {
      prevTotal.current = totalCents;
      return;
    }
    if (prevTotal.current === totalCents) return;
    prevTotal.current = totalCents;
    setTotalPulse(true);
    const timer = setTimeout(() => setTotalPulse(false), 300);
    return () => clearTimeout(timer);
  }, [totalCents]);

  useEffect(() => {
    const refresh = () => {
      const token = localStorage.getItem('donor_token');
      if (!token) {
        setDonor(null);
        return;
      }
      getDonor()
        .then(setDonor)
        .catch(() => setDonor(null));
    };
    refresh();
    window.addEventListener('donor-token-changed', refresh);
    return () => window.removeEventListener('donor-token-changed', refresh);
  }, []);

  // Reset the transient checkout-review state whenever the drawer is
  // reopened or the cart changes, so stale issues/nudges don't linger.
  useEffect(() => {
    if (drawerOpen) {
      setPhase('idle');
      setIssues([]);
      setNudgeAcknowledged(false);
      setCheckoutError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);

  if (!drawerOpen) return null;

  // Client-side estimate only — the server applies additional rules (a
  // Stripe-minimum-charge guard, and a shipping exception for physical
  // rewards) that can shift the exact figure by up to ~50 cents in rare
  // cases. The authoritative amount is shown on the post-submit
  // confirmation. See CLAUDE.md / design notes for this known gap.
  const estimatedWalletCredit = donor ? Math.min(donor.balance_remaining, totalCents) : 0;
  const estimatedOwed = totalCents - estimatedWalletCredit;

  const runCheckout = async () => {
    setPhase('checking');
    const freshIssues = await revalidateCart();
    if (freshIssues.length > 0) {
      setIssues(freshIssues);
      setPhase('issues');
      return;
    }
    if (unvisitedAvailableCategories.length > 0 && !nudgeAcknowledged) {
      setPhase('nudge');
      return;
    }
    setPhase('idle');
    const result = await checkout();
    // checkout() redirects away itself when result.donate_url is present.
    // A non-null result with no donate_url means Stripe isn't configured
    // (dev/local only) — the pledge was created but there's nowhere to send
    // the donor, so surface that inline instead of silently doing nothing.
    if (result && !result.donate_url) {
      setCheckoutError('Checkout unavailable — contact the event organizer.');
    }
  };

  const handleCheckoutClick = () => {
    void runCheckout();
  };

  const handleSkipNudge = () => {
    setNudgeAcknowledged(true);
    void runCheckout();
  };

  const removeIssueItem = (issue: CartIssue) => {
    removeFromCart(issue.item.kind, issue.item.target_id);
    setIssues((prev) => {
      const next = prev.filter((i) => i !== issue);
      if (next.length === 0) setPhase('idle');
      return next;
    });
  };

  const disableCheckout =
    submitting || phase === 'checking' || (cart.length === 0 && topUpCents <= 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="cart">
      <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} />
      <div
        className="relative w-full max-w-sm h-full overflow-y-auto p-4 flex flex-col animate-slide-in-right"
        style={{ background: 'var(--dark-gray)', borderLeft: '1px solid rgba(239,238,236,.08)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-data font-bold text-sm text-off-white uppercase tracking-wider">
            your cart
          </h3>
          <button
            onClick={closeDrawer}
            className="text-off-white/55 hover:text-off-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {donor && (
          <div className="btrl-panel p-3 mb-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-d-yellow mb-1">
              wallet balance
            </p>
            <p className="font-display text-2xl text-off-white">{fmt(donor.balance_remaining)}</p>
          </div>
        )}

        <div className="flex-1">
          {cart.length === 0 ? (
            <p className="font-body text-sm text-off-white/55">No items selected yet.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div
                  key={`${item.kind}-${item.target_id}`}
                  className="flex justify-between items-start text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-data text-off-white truncate">
                      {item.label || item.kind.toLowerCase()}
                    </p>
                    <p className="font-mono text-[10px] text-off-white/55 uppercase">
                      {KIND_LABELS[item.kind] ?? item.kind.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="font-data text-d-yellow">{fmt(item.amount_cents)}</span>
                    <button
                      onClick={() => removeFromCart(item.kind, item.target_id)}
                      className="text-off-white/55 hover:text-red text-xs"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="btrl-panel p-3 mb-4">
            <label className="block font-data font-bold text-sm mb-1 text-off-white">
              additional donation <span className="text-off-white/40 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 text-sm"
              placeholder="0.00"
              value={topUp}
              onChange={(e) => setTopUp(sanitizeMoneyInput(e.target.value))}
            />
          </div>

          <div
            className="flex justify-between font-data font-bold pt-3 mb-4"
            style={{ borderTop: '1px solid rgba(239,238,236,.08)' }}
          >
            <span className="text-off-white">total</span>
            <span
              className={`text-d-yellow inline-block ${totalPulse ? 'animate-total-pulse' : ''}`}
            >
              {fmt(totalCents)}
            </span>
          </div>

          {donor && donor.balance_remaining > 0 && totalCents > 0 && (
            <div className="btrl-panel p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-off-white/55">estimated wallet credit</span>
                <span style={{ color: 'var(--green)' }}>-{fmt(estimatedWalletCredit)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-off-white">estimated amount owed</span>
                <span className="text-d-yellow">{fmt(Math.max(0, estimatedOwed))}</span>
              </div>
              <p className="font-body text-[10px] text-off-white/55 mt-1">
                Estimate only — exact figure is confirmed at checkout.
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block font-data font-bold text-sm mb-1 text-off-white">
              email address
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block font-data font-bold text-sm mb-1 text-off-white">
              comment <span className="text-off-white/40 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm"
              rows={2}
              maxLength={500}
              placeholder="Leave a message with your donation"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {phase === 'nudge' && (
            <div
              className="p-3 mb-4 rounded-sm text-sm"
              style={{ background: 'rgba(208,152,70,.16)' }}
            >
              <p className="font-data text-d-yellow mb-2">
                You haven't looked at{' '}
                {unvisitedAvailableCategories.map((c) => CATEGORY_LABELS[c]).join(', ')} yet.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeDrawer}
                  className="btrl-button btrl-button-outline text-sm flex-1"
                >
                  go look
                </button>
                <button onClick={handleSkipNudge} className="btrl-button text-sm flex-1">
                  skip anyway
                </button>
              </div>
            </div>
          )}

          {phase === 'issues' && issues.length > 0 && (
            <div
              className="p-3 mb-4 rounded-sm text-sm"
              style={{ background: 'rgba(224,90,90,.16)' }}
            >
              <p className="font-data mb-2" style={{ color: 'var(--red)' }}>
                Some items in your cart are no longer available:
              </p>
              <div className="space-y-1">
                {issues.map((issue, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-off-white">
                      {issue.item.label || issue.item.kind} — {issue.reason}
                    </span>
                    <button
                      onClick={() => removeIssueItem(issue)}
                      className="btrl-button btrl-button-outline text-xs"
                    >
                      remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {checkoutError && (
            <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>
              {checkoutError}
            </p>
          )}
        </div>

        <button
          onClick={handleCheckoutClick}
          disabled={disableCheckout}
          className="btrl-button w-full text-center text-lg py-3"
          style={{ background: 'var(--d-yellow)', color: 'black' }}
        >
          {submitting
            ? 'redirecting to checkout...'
            : phase === 'checking'
              ? 'checking availability...'
              : `donate ${fmt(totalCents)}`}
        </button>
      </div>
    </div>
  );
}
