export default function ProgressBar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      {label && <div className="flex justify-between text-sm text-gray-600 mb-1">{label}</div>}
      <div
        className="h-4 rounded-full overflow-hidden border"
        style={{ background: 'rgba(20, 15, 36, 0.72)', borderColor: 'var(--esa-border)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--esa-purple), var(--esa-orange))',
          }}
        />
      </div>
    </div>
  );
}
