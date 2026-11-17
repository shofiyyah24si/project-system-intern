import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { LuUsers, LuClipboardList, LuPackageOpen } from "react-icons/lu";
import { manpowerAPI } from "../services/manpowerAPI";
import { meetingAPI } from "../services/meetingAPI";
import { assetAPI } from "../services/assetAPI";

function ResultIcon({ type }) {
  const cls = "text-[#1d4f91] flex-shrink-0";
  if (type === "manpower") return <LuUsers className={cls} />;
  if (type === "asset") return <LuPackageOpen className={cls} />;
  return <LuClipboardList className={cls} />;
}

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [searchIndex, setSearchIndex] = useState([]);

  useEffect(() => {
    Promise.all([
      manpowerAPI.fetchAll(),
      meetingAPI.fetchSessions(),
      assetAPI.fetchItems(),
    ]).then(([manpower, sessions, assets]) => {
      setSearchIndex([
        ...manpower.map((m) => ({
          label: m.nama,
          sub: `${m.no_badge} · ${m.posisi || "-"} · ${m.departemen || "-"}`,
          icon: "manpower",
          to: `/manpower`,
        })),
        ...sessions.map((s) => ({
          label: `Meeting ${new Date(s.tanggal_meeting).toLocaleDateString("id-ID")}`,
          sub: s.lokasi,
          icon: "meeting",
          to: `/meetings/${s.id}`,
        })),
        ...assets.map((a) => ({
          label: a.nama_item,
          sub: `${a.category?.nama_kategori || "-"} · ${a.status}`,
          icon: "asset",
          to: a.category?.nama_kategori === "PGD" ? "/pgd" : "/kp",
        })),
      ]);
    }).catch(console.error);
  }, []);

  const results = query.trim().length > 0
    ? searchIndex.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (to) => {
    navigate(to);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-gray-100">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
          <input
            autoFocus
            type="text"
            placeholder="Cari manpower, sesi meeting, aset..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 outline-none text-sm text-[#1C1D22]"
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {results.length > 0 && (
            <ul className="py-2">
              {results.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleSelect(item.to)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#e8eff8] transition text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#e8eff8] flex items-center justify-center flex-shrink-0">
                      <ResultIcon type={item.icon} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1D22] truncate">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.sub}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim() && results.length === 0 && (
            <p className="py-8 text-sm text-gray-400 text-center">
              Tidak ada hasil untuk "<strong>{query}</strong>"
            </p>
          )}

          {!query.trim() && (
            <p className="py-8 text-sm text-gray-400 text-center">
              Ketik untuk mencari...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
