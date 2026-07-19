export default function Card({ children, className = '' }) {
  return <div className={`btrl-panel p-4 ${className}`}>{children}</div>;
}
