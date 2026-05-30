export default function Card({ children, className = '' }) {
  return (
    <div className={`esa-panel rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}
