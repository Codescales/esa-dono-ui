import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: ReactNode;
  animateOnChange?: boolean;
}

export default function ProgressBar({
  value,
  max,
  label,
  animateOnChange = true,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const [animating, setAnimating] = useState(false);
  const [gainText, setGainText] = useState<string | null>(null);
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }

    if (animateOnChange && value > prevValueRef.current) {
      const diff = value - prevValueRef.current;
      setGainText(`+$${(diff / 100).toFixed(0)}`);
      setAnimating(true);

      const timer = setTimeout(() => {
        setAnimating(false);
      }, 1200);

      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }

    prevValueRef.current = value;
  }, [value, animateOnChange]);

  return (
    <div className="relative">
      {label && (
        <div className="flex justify-between font-data text-sm text-off-white/55 mb-1">{label}</div>
      )}

      {/* Progress Track */}
      <div
        className="relative h-4 rounded-sm overflow-visible"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        data-testid="progress-track"
      >
        {/* Fill Gauge */}
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out overflow-hidden"
          style={{
            width: `${pct}%`,
            background: 'var(--grad)',
            boxShadow: animating ? '0 0 12px rgba(208, 152, 70, 0.6)' : undefined,
          }}
          data-testid="progress-fill"
        />

        {/* Coin & Plus Animation popup on fill head */}
        {animating && (
          <div
            className="absolute top-0 flex items-center gap-1 pointer-events-none z-10"
            style={{
              left: `${Math.max(2, Math.min(96, pct))}%`,
              transform: 'translateX(-50%)',
            }}
            data-testid="progress-animation"
          >
            {/* Spinning Coin */}
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow text-dark-gray font-mono font-bold text-xs shadow-md animate-coin-bounce select-none border border-d-yellow"
              title="Coin"
            >
              🪙
            </span>

            {/* Plus Gain Label */}
            <span className="font-data font-bold text-xs text-yellow text-shadow animate-plus-float select-none whitespace-nowrap">
              {gainText || '+'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
