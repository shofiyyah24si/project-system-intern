export default function AppSelect({ className = "", children, ...rest }) {
  return (
    <select
      className={`border border-gray-200 bg-white rounded-md px-3 py-2 text-sm outline-none focus:border-[#1d4f91] ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
