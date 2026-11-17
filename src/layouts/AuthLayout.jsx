import { Outlet } from "react-router-dom";
import { LuUsers, LuClipboardCheck, LuIdCard } from "react-icons/lu";

function IconPGD() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke="white" strokeWidth="1.5" />
      <rect x="8.5" y="5" width="7" height="4.5" rx="0.5" stroke="white" strokeWidth="1.2" />
      <line x1="10" y1="6.5" x2="13.5" y2="6.5" stroke="white" strokeWidth="1" />
      <line x1="10" y1="8" x2="12" y2="8" stroke="white" strokeWidth="1" />
      <circle cx="12" cy="14" r="2" stroke="white" strokeWidth="1.2" />
      <line x1="9.5" y1="18.5" x2="14.5" y2="18.5" stroke="white" strokeWidth="1" />
    </svg>
  );
}

const features = [
  { icon: <LuUsers size={16} className="text-white" />,        text: "Manajemen data manpower real-time" },
  { icon: <LuClipboardCheck size={16} className="text-white" />, text: "Rekap kehadiran weekly HSE meeting" },
  { icon: <LuIdCard size={16} className="text-white" />,       text: "Monitoring kartu pengemudi (KP)" },
  { icon: <IconPGD />,                                          text: "Pemantauan Personal Gas Detector" },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── Panel Kiri ── */}
      <div className="hidden lg:flex flex-col w-[46%] bg-[#1d4f91] relative overflow-hidden">
        {/* Dekorasi lingkaran */}
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-12 w-48 h-48 rounded-full bg-[#FFCC91]/10" />

        <div className="relative z-10 flex flex-col h-full p-10">

          {/* ── Logo WKS + PHR + K3 ── */}
          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-sm">
            {/* Kiri: PHR + K3 */}
            <div className="flex items-center gap-3">
              <img src="/img/logo phr.png" alt="Pertamina Hulu Rokan" className="h-8 object-contain" />
              <div className="w-px h-6 bg-gray-200" />
              <img src="/img/Logo K3.png" alt="K3" className="h-8 object-contain" />
            </div>
            {/* Kanan: PT Wahanakarsa */}
            <img src="/img/Logo PT WAHANAKARSA SWANDIRI.png" alt="PT Wahanakarsa Swandiri" className="h-8 object-contain" />
          </div>

          {/* ── Konten tengah ── */}
          <div className="flex-1 flex flex-col justify-center py-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3.5 py-1.5 mb-6 w-fit">
              <div className="w-2 h-2 rounded-full bg-[#FFCC91] animate-pulse" />
              <span className="text-white/80 text-xs font-medium tracking-wide">Health, Safety & Environment</span>
            </div>

            {/* Judul */}
            <h1 className="text-white text-[2rem] font-bold leading-snug mb-4">
              Sistem Informasi<br />
              <span className="text-[#FFCC91]">Manajemen HSE</span>
            </h1>

            <p className="text-white/65 text-sm leading-relaxed mb-8 max-w-xs">
              Platform terintegrasi untuk pengelolaan data manpower, kehadiran safety meeting, dan aset keselamatan kerja di lapangan.
            </p>

            {/* Feature list */}
            <div className="space-y-2.5">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                    {f.icon}
                  </div>
                  <p className="text-white/80 text-sm">{f.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Stats bawah ── */}
          <div className="border-t border-white/10 pt-6">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { value: "350+", label: "Manpower" },
                { value: "52x",  label: "Meeting / Tahun" },
                { value: "100+", label: "Aset HSE" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-white/45 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Panel Kanan ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-[420px]">

          {/* Logo mobile */}
          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-sm border border-gray-100 mb-6 lg:hidden">
            <div className="flex items-center gap-3">
              <img src="/img/logo phr.png" alt="PHR" className="h-7 object-contain" />
              <div className="w-px h-5 bg-gray-200" />
              <img src="/img/Logo K3.png" alt="K3" className="h-7 object-contain" />
            </div>
            <img src="/img/Logo PT WAHANAKARSA SWANDIRI.png" alt="PT Wahanakarsa" className="h-7 object-contain" />
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <Outlet />
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            &copy; 2026 WKS HSE System · Internal use only
          </p>
        </div>
      </div>

    </div>
  );
}
