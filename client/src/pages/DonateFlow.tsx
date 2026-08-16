import { useState } from 'react';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import RewardList from '../components/incentives/RewardList';
import PollList from '../components/incentives/PollList';
import GoalList from '../components/incentives/GoalList';
import { sanitizeMoneyInput } from '../utils/money';
import type { PledgeResult } from '../types';

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const STEPS = ['rewards', 'polls', 'goals', 'checkout'];
const COMMENT_MAX_LENGTH = 500;

export default function DonateFlow() {
  const {
    loading,
    cart,
    cartTotal,
    totalCents,
    email,
    setEmail,
    comment,
    setComment,
    topUp,
    setTopUp,
    submitting,
    checkoutError,
    checkout,
  } = useCart();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [pledgeResult, setPledgeResult] = useState<PledgeResult | null>(null);

  const goNext = () => {
    setDirection('next');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setDirection('prev');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCheckout = async () => {
    const result = await checkout();
    // If a donate_url came back, checkout() has already redirected away.
    // Only surfaces a confirmation here for the rare case where Stripe
    // isn't configured (result.donate_url is null) and there's nowhere
    // else to send the donor.
    if (result && !result.donate_url) {
      setPledgeResult(result);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (pledgeResult) {
    const discount = pledgeResult.wallet_discount_cents ?? 0;
    return (
      <div className="max-w-2xl mx-auto p-8">
        <Card>
          <h2 className="font-display text-3xl lowercase text-off-white mb-4">
            your pledge is ready
          </h2>
          <p className="font-body text-sm text-off-white/55 mb-4">
            You've selected{' '}
            <strong className="text-d-yellow">{fmt(pledgeResult.total_cents)}</strong> in
            incentives. Anything you donate above this amount will be credited to your wallet as
            spendable balance.
          </p>
          <div className="btrl-panel p-4 mb-4">
            <p className="font-data text-sm text-off-white/55 mb-1">cart total</p>
            <p className="font-display text-4xl text-d-yellow">{fmt(pledgeResult.total_cents)}</p>
            {discount > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(239,238,236,.08)' }}>
                <p className="font-data text-sm text-off-white/55 mb-1">wallet credit applied</p>
                <p className="font-display text-xl" style={{ color: 'var(--green)' }}>
                  -{fmt(discount)}
                </p>
                {discount < pledgeResult.total_cents && (
                  <p className="font-display text-sm text-off-white mt-1">
                    you'll be charged {fmt(pledgeResult.total_cents - discount)}
                  </p>
                )}
              </div>
            )}
          </div>
          <p className="font-body text-xs text-off-white/55">
            No checkout URL configured. Contact the event organizer.
          </p>
        </Card>
      </div>
    );
  }

  const slideClass = direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-data font-bold text-sm ${
                i <= step ? 'text-black' : 'text-off-white/55'
              }`}
              style={{
                background: i <= step ? 'var(--d-yellow)' : 'rgba(239,238,236,.08)',
              }}
            >
              {i + 1}
            </div>
            <span
              className={`font-data text-sm lowercase hidden sm:inline ${
                i <= step ? 'text-off-white' : 'text-off-white/55'
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-off-white/55 mx-1">&rarr;</span>}
          </div>
        ))}
      </div>

      <div className={`transition-all duration-300 ${slideClass}`}>
        {step === 0 && <RewardList />}
        {step === 1 && <PollList />}
        {step === 2 && <GoalList />}
        {step === 3 && (
          <CheckoutStep
            cart={cart}
            cartTotal={cartTotal}
            totalCents={totalCents}
            email={email}
            onEmailChange={setEmail}
            comment={comment}
            onCommentChange={setComment}
            topUp={topUp}
            onTopUpChange={setTopUp}
            error={checkoutError}
            submitting={submitting}
            onSubmit={handleCheckout}
          />
        )}
      </div>

      {/* Navigation. No empty-cart gate — the point of the stepper is to
          guarantee donors see every incentive category, not to force a
          purchase; browsing without adding anything is a valid outcome. */}
      <div className="flex justify-between items-center mt-8">
        <button onClick={goBack} disabled={step === 0} className="btrl-button btrl-button-outline">
          &larr; back
        </button>
        <div className="flex items-center gap-4">
          {step < STEPS.length - 1 ? (
            <button onClick={goNext} className="btrl-button">
              next &rarr;
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Checkout ─── */
function CheckoutStep({
  cart,
  cartTotal,
  totalCents,
  email,
  onEmailChange,
  comment,
  onCommentChange,
  topUp,
  onTopUpChange,
  error,
  submitting,
  onSubmit,
}: {
  cart: { kind: string; target_id: string; amount_cents: number; label?: string }[];
  cartTotal: number;
  totalCents: number;
  email: string;
  onEmailChange: (value: string) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  topUp: string;
  onTopUpChange: (value: string) => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-3xl lowercase text-off-white mb-2">checkout</h2>
      <p className="font-body text-sm text-off-white/55 mb-6">
        Review your selections. You'll donate at least{' '}
        <strong className="text-d-yellow">{fmt(cartTotal)}</strong>. Anything extra will be credited
        to your wallet as spendable balance.
      </p>

      <Card className="mb-4">
        <h3 className="font-data font-bold text-sm text-off-white mb-3 uppercase tracking-wider">
          cart summary
        </h3>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={`${item.kind}-${item.target_id}`} className="flex justify-between text-sm">
              <span className="font-data text-off-white">{item.label || item.kind}</span>
              <span className="font-data text-d-yellow">{fmt(item.amount_cents)}</span>
            </div>
          ))}
          {cart.length === 0 && (
            <p className="font-body text-sm text-off-white/55">No incentives selected.</p>
          )}
        </div>
        <div
          className="flex justify-between font-data font-bold pt-3 mt-3"
          style={{ borderTop: '1px solid rgba(239,238,236,.08)' }}
        >
          <span className="text-off-white">minimum donation</span>
          <span className="text-d-yellow">{fmt(cartTotal)}</span>
        </div>
      </Card>

      <Card className="mb-4">
        <label className="block font-data font-bold text-sm mb-1 text-off-white">
          additional donation <span className="text-off-white/40 font-normal">(optional)</span>
        </label>
        <p className="font-body text-xs text-off-white/55 mb-2">
          Add extra on top of your incentives. It's credited to your wallet as spendable balance.
        </p>
        <input
          type="number"
          step="0.01"
          min="0"
          className="w-full px-3 py-2 text-sm"
          placeholder="0.00"
          value={topUp}
          onChange={(e) => onTopUpChange(sanitizeMoneyInput(e.target.value))}
        />
      </Card>

      <Card className="mb-4">
        <label className="block font-data font-bold text-sm mb-1 text-off-white">
          email address
        </label>
        <p className="font-body text-xs text-off-white/55 mb-2">
          Your magic link and receipt will be sent here.
        </p>
        <input
          type="email"
          className="w-full px-3 py-2 text-sm"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </Card>

      <Card className="mb-4">
        <label className="block font-data font-bold text-sm mb-1 text-off-white">
          comment <span className="text-off-white/40 font-normal">(optional)</span>
        </label>
        <textarea
          className="w-full px-3 py-2 text-sm"
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Leave a message with your donation"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
        />
        <p className="font-data text-xs text-off-white/40 mt-1 text-right">
          {comment.length}/{COMMENT_MAX_LENGTH}
        </p>
      </Card>

      {error && (
        <p className="text-sm mb-3" style={{ color: 'var(--red)' }}>
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting || (cart.length === 0 && totalCents <= 0)}
        className="btrl-button w-full text-center text-lg py-3"
        style={{ background: 'var(--d-yellow)', color: 'black' }}
      >
        {submitting ? 'redirecting to checkout...' : `donate ${fmt(totalCents)}`}
      </button>
    </div>
  );
}
