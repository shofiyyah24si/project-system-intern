// badge status generik — warna otomatis sesuai config yang di-pass
const DEFAULT_CONFIG = {
  hadir:       { label: "Hadir",       styles: "bg-green-100 text-green-600" },
  tidak_hadir: { label: "Tidak Hadir", styles: "bg-red-100 text-red-600" },
  tersedia:    { label: "Tersedia",    styles: "bg-green-100 text-green-600" },
  dipegang:    { label: "Dipegang",    styles: "bg-yellow-100 text-yellow-600" },
  expired:     { label: "Expired",     styles: "bg-red-100 text-red-600" },
  aktif:       { label: "Aktif",       styles: "bg-green-100 text-green-600" },
  nonaktif:    { label: "Nonaktif",    styles: "bg-gray-100 text-gray-600" },
};

export default function StatusBadge({ status, config = DEFAULT_CONFIG }) {
  const badge = config[status] || { label: status, styles: "bg-gray-100 text-gray-600" };

  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${badge.styles}`}
    >
      {badge.label}
    </span>
  );
}
