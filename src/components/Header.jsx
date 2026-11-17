import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaSearch } from "react-icons/fa";
import { LuUserCog, LuLogOut, LuUser } from "react-icons/lu";
import SearchModal from "./SearchModal";

export default function Header({ onToggleSidebar }) {
  const navigate    = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);
  const dropRef = useRef(null);

  // Ambil data user dari localStorage (sinkron dengan Sidebar)
  const raw  = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  const nama  = user?.nama || user?.name || "Admin";
  const foto  = user?.foto || user?.avatar || user?.photo || "";
  const inisial = nama.charAt(0).toUpperCase();

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex justify-between items-center bg-white px-6 py-3 shadow-sm border-b border-gray-100 relative z-10">

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-lg bg-gray-100 mr-3 text-gray-600"
        onClick={onToggleSidebar}>
        <FaBars className="text-xl" />
      </button>

      {/* Search bar */}
      <div className="relative w-full max-w-sm cursor-pointer"
        onClick={() => setSearchOpen(true)}>
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input type="text" placeholder="Cari manpower, sesi meeting, aset..." readOnly
          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none cursor-pointer text-gray-400" />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-4">

        {/* Logo PHR */}
        <img
          src="/img/logo phr.png"
          alt="Pertamina Hulu Rokan"
          className="h-8 w-auto hidden sm:block"
        />

        {/* Avatar + Dropdown */}
        <div ref={dropRef} className="relative flex items-center gap-3 pl-3 border-l border-gray-100">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[#1C1D22]">
              {nama}
            </p>
            <p className="text-xs text-gray-400">
              {user?.role === "admin" ? "Administrator" : "Staff HSE"}
            </p>
          </div>

          {/* Avatar button */}
          <button
            onClick={() => setDropOpen(v => !v)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 hover:border-[#1d4f91] transition focus:outline-none focus:ring-2 focus:ring-[#1d4f91] focus:ring-offset-1">
            {foto ? (
              <img src={foto} alt={nama} className="w-full h-full object-cover"
                onError={e => { e.target.style.display = "none"; }} />
            ) : (
              <div className="w-full h-full bg-[#1d4f91] flex items-center justify-center">
                <span className="text-white font-bold text-sm">{inisial}</span>
              </div>
            )}
          </button>

          {/* Dropdown menu */}
          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1.5 z-50">
              {/* Info user */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-[#1C1D22] truncate">
                  {nama}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {user?.email || ""}
                </p>
              </div>

              {/* Menu items */}
              <button
                onClick={() => { setDropOpen(false); navigate("/profile"); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-[#e8eff8] hover:text-[#1d4f91] transition text-left">
                <LuUserCog className="text-base flex-shrink-0" />
                Pengaturan Profil
              </button>

              <div className="my-1 border-t border-gray-100" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#CC5F5F] hover:bg-red-50 transition text-left">
                <LuLogOut className="text-base flex-shrink-0" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
