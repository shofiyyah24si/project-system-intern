export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 gap-4">

      {/* Logo + spinner */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-[#cfdcee] border-t-[#1d4f91] rounded-full animate-spin" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-9 h-9 rounded-md flex items-center justify-center shadow overflow-hidden">
          <img src="/img/logo.png" alt="HSE" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Brand name */}
      <div className="text-center">
        <p className="text-[#1C1D22] text-base font-semibold leading-tight">
          Sistem Informasi <span className="text-[#1d4f91]">HSE</span>
        </p>
        <p className="text-gray-400 text-xs mt-1">Memuat...</p>
      </div>

    </div>
  );
}
