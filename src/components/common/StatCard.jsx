export default function StatCard({ label, value, sub, tone = "" }) {
  const color = { green: "text-[#519C66]", amber: "text-amber-600", red: "text-[#CC5F5F]" }[tone] || "text-[#1C1D22]";
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
