import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [collapsed, setCollapsed]         = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );

  const handleToggleCollapse = () => {
    setCollapsed((v) => {
      localStorage.setItem("sidebarCollapsed", String(!v));
      return !v;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* sidebar */}
      <div className={`fixed z-30 md:static h-screen flex-shrink-0 transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <Sidebar collapsed={collapsed} onToggle={handleToggleCollapse} />
      </div>

      {/* konten utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>

    </div>
  );
}
