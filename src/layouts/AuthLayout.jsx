// layout untuk halaman login, register, lupa password
// panel kiri branding, panel kanan form dari <Outlet />
import { Outlet } from "react-router-dom";


export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* panel kiri — hanya tampil di layar lg ke atas */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 p-12 bg-[#1d4f91] relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-[-40px] w-32 h-32 rounded-full bg-[#FFCC91]/20" />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-white rounded-lg p-2">
              <img src="/img/logo.png" alt="logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="text-left">
              <p className="text-white text-2xl leading-tight">
                HSE
              </p>
              <p className="text-[#FFCC91] text-2xl leading-tight">
                Admin System
              </p>
            </div>
          </div>

          <p className="text-white/80 text-sm leading-relaxed mb-10">
            Sistem informasi kehadiran weekly safety meeting dan serah terima aset HSE yang lebih akurat dan efisien.
          </p>

          <div className="flex justify-center gap-6">
            {[
              { value: "350+", label: "Manpower" },
              { value: "4",    label: "Kategori Aset" },
              { value: "1x",   label: "Meeting/Minggu" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-bold text-2xl text-white">
                  {s.value}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* panel kanan — form login/register dirender dari <Outlet /> */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8">

          {/* logo muncul di mobile karena panel kiri tersembunyi */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="bg-white p-1 rounded-md">
              <img src="/img/logo.png" alt="logo" className="w-7 h-7 object-contain" />
            </div>
            <p className="text-xl text-[#1C1D22]">
              HSE <span className="text-[#1d4f91]">Admin</span>
            </p>
          </div>

          <Outlet />

          <p className="text-center text-xs text-gray-400 mt-8">
            &copy; 2026 Sistem Informasi HSE. Internal use only.
          </p>
        </div>
      </div>

    </div>
  );
}
