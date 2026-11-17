export default function AppCard({ children, className = "", ...rest }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}
