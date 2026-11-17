import { NavLink, useNavigate } from "react-router-dom";
import { LuUsers, LuClipboardCheck, LuIdCard, LuGauge, LuUserCog, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { MdLogout } from "react-icons/md";

function IconDashboard({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="1" y="1" width="8" height="8" rx="2"
        fill={active ? "white" : "none"}
        stroke={active ? "white" : "#9ca3af"} strokeWidth="1.5" />
      <rect x="11" y="1" width="8" height="8" rx="2"
        fill={active ? "#bcd0ea" : "none"}
        stroke={active ? "#bcd0ea" : "#9ca3af"} strokeWidth="1.5" />
      <rect x="1" y="11" width="8" height="8" rx="2"
        fill={active ? "white" : "none"}
        stroke={active ? "white" : "#9ca3af"} strokeWidth="1.5" />
      <rect x="11" y="11" width="8" height="8" rx="2"
        fill={active ? "white" : "none"}
        stroke={active ? "white" : "#9ca3af"} strokeWidth="1.5" />
    </svg>
  );
}

function IconPGD({ active }) {
  const c = active ? "white" : "#9ca3af";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke={c} strokeWidth="1.5" />
      <rect x="8.5" y="5" width="7" height="4.5" rx="0.5" stroke={c} strokeWidth="1.2" />
      <line x1="10" y1="6.5" x2="13.5" y2="6.5" stroke={c} strokeWidth="1" />
      <line x1="10" y1="8" x2="12" y2="8" stroke={c} strokeWidth="1" />
      <circle cx="12" cy="14" r="2" stroke={c} strokeWidth="1.2" />
      <line x1="9.5" y1="18.5" x2="14.5" y2="18.5" stroke={c} strokeWidth="1" />
    </svg>
  );
}

const menuAll = [
  { key: "dashboard", label: "Dashboard",        to: "/dashboard" },
  { key: "manpower",  label: "Data Manpower",     to: "/manpower"  },
  { key: "meeting",   label: "Kehadiran Meeting", to: "/meetings"  },
  { key: "kp",        label: "Kartu Pengemudi",   to: "/kp"        },
  { key: "pgd",       label: "PGD",               to: "/pgd"       },
];

const menuAdmin = [
  { key: "users", label: "Manajemen User", to: "/users" },
];

function MenuIcon({ itemKey, active }) {
  const cls = `text-[20px] flex-shrink-0 ${active ? "text-white" : "text-gray-400"}`;
  switch (itemKey) {
    case "dashboard": return <IconDashboard active={active} />;
    case "manpower":  return <LuUsers className={cls} />;
    case "meeting":   return <LuClipboardCheck className={cls} />;
    case "kp":        return <LuIdCard className={cls} />;
    case "pgd":       return <IconPGD active={active} />;
    case "users":     return <LuUserCog className={cls} />;
    default:          return null;
  }
}

function MenuItem({ item, collapsed }) {
  return (
    <li>
      <NavLink
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `flex items-center rounded-md transition-all duration-200
          ${collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"}
          ${isActive
            ? "bg-[#1d4f91] text-white font-semibold shadow-sm"
            : "text-gray-500 hover:bg-[#e8eff8] hover:text-[#1d4f91]"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <MenuIcon itemKey={item.key} active={isActive} />
            {!collapsed && <span className="text-sm truncate">{item.label}</span>}
          </>
        )}
      </NavLink>
    </li>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();

  const raw  = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;
  const isAdmin = user?.role === "admin";
  // handle kolom nama yang mungkin "nama" atau "name"
  const displayName = user?.nama || user?.name || user?.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className={`relative flex h-screen flex-col bg-white shadow-lg border-r border-gray-100
      transition-all duration-300 ${collapsed ? "w-[68px]" : "w-64"}`}>

      {/* Toggle button — menempel di tepi kanan sidebar */}
      <button
        onClick={onToggle}
        title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
        className="absolute -right-3 top-6 z-50 w-6 h-6 rounded-full bg-white border border-gray-200
          shadow-md flex items-center justify-center text-gray-500 hover:text-[#1d4f91]
          hover:border-[#1d4f91] transition"
      >
        {collapsed ? <LuChevronRight size={13} /> : <LuChevronLeft size={13} />}
      </button>

      {/* Logo */}
      <div className={`border-b border-gray-100 flex items-center justify-center overflow-hidden
        transition-all duration-300 ${collapsed ? "px-3 py-4" : "px-4 py-4"}`}>
        {collapsed ? (
          <img
            src="/img/logo.png"
            alt="Logo"
            className="w-9 h-9 object-contain"
          />
        ) : (
          <img
            src="/img/Logo PT WAHANAKARSA SWANDIRI.png"
            alt="PT Wahanakarsa Swandiri"
            className="w-full h-auto max-h-14 object-contain"
          />
        )}
      </div>

      {/* Info user */}
      {user && (
        <div className={`border-b border-gray-100 transition-all duration-300
          ${collapsed ? "px-2 py-3 flex justify-center" : "px-4 py-3"}`}>
          {collapsed ? (
            <div
              title={displayName}
              className="w-9 h-9 rounded-md bg-[#e8eff8] text-[#1d4f91] flex items-center
                justify-center font-bold text-sm flex-shrink-0"
            >
              {initial}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#e8eff8] text-[#1d4f91] flex items-center
                justify-center font-bold text-sm flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1C1D22] truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">
                  {isAdmin ? "HSE Admin" : "Staff HSE"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Menu */}
      <div className={`flex-1 py-5 overflow-y-auto overflow-x-hidden
        ${collapsed ? "px-2" : "px-4"}`}>
        {!collapsed && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
            Menu Utama
          </p>
        )}
        {collapsed && <div className="mb-3 h-px bg-gray-100" />}
        <ul className="space-y-1">
          {menuAll.map(item => (
            <MenuItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </ul>

        {isAdmin && (
          <>
            {!collapsed ? (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-3 px-2">
                Administrasi
              </p>
            ) : (
              <div className="my-3 h-px bg-gray-100" />
            )}
            <ul className="space-y-1">
              {menuAdmin.map(item => (
                <MenuItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Logout */}
      <div className={`border-t border-gray-100 transition-all duration-300
        ${collapsed ? "px-2 py-4 flex flex-col items-center gap-2" : "px-4 py-4 space-y-2"}`}>
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center rounded-md text-[#CC5F5F] hover:bg-red-50 transition text-sm
            ${collapsed ? "justify-center w-full py-2.5" : "gap-3 w-full px-3 py-2.5"}`}
        >
          <MdLogout className="text-xl flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && (
          <p className="text-xs text-gray-400 text-center">
            &copy; 2026 Sistem Informasi HSE
          </p>
        )}
      </div>
    </div>
  );
}
