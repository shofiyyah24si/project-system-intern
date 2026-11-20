import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LuSearch, LuDownload, LuArrowLeft, LuUsers, LuChevronDown,
  LuChevronUp, LuCheckCheck, LuLayoutList, LuList,
} from "react-icons/lu";
import { meetingAPI } from "../../services/meetingAPI";
import { exportXlsx } from "../../lib/helpers";
import { useRole } from "../../lib/useRole";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppButton from "../../components/common/AppButton";

// ── Badge status hadir ──────────────────────────────────────
function HadirBadge({ status }) {
  if (status === "hadir")
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Hadir</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[#CC5F5F]">Tidak Hadir</span>;
}

// ── Satu baris orang ───────────────────────────────────────
function AttendanceRow({ a, onToggle, isViewer }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#1C1D22] truncate">{a.manpower.nama}</p>
        <p className="text-xs text-gray-400 truncate">
          {a.manpower.no_badge} · {a.manpower.posisi || "-"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <HadirBadge status={a.status_hadir} />
        {!isViewer && (
          <button
            onClick={() => onToggle(a)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition min-w-[90px] ${
              a.status_hadir === "hadir"
                ? "bg-red-50 text-[#CC5F5F] hover:bg-red-100"
                : "bg-[#1d4f91] text-white hover:bg-[#17407a]"
            }`}
          >
            {a.status_hadir === "hadir" ? "Batalkan" : "Tandai Hadir"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Grup per departemen ─────────────────────────────────────
function DeptGroup({ dept, members, onToggle, onMarkAll, isViewer }) {
  const [open, setOpen] = useState(true);
  const nHadir = members.filter((m) => m.status_hadir === "hadir").length;
  const allHadir = nHadir === members.length;

  return (
    <div className="mb-3">
      {/* header dept */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-[#1d4f91] rounded-t-lg cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <LuUsers size={14} className="text-white/80" />
          <p className="text-sm font-bold text-white">{dept}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/80">
            <span className="text-white font-bold">{nHadir}</span>/{members.length} hadir
          </span>
          {!isViewer && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarkAll(members, !allHadir); }}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 transition"
            >
              <LuCheckCheck size={12} />
              {allHadir ? "Batal Semua" : "Semua Hadir"}
            </button>
          )}
          {open ? <LuChevronUp size={14} className="text-white/80" /> : <LuChevronDown size={14} className="text-white/80" />}
        </div>
      </div>
      {/* anggota */}
      {open && (
        <div className="border border-t-0 border-gray-100 rounded-b-lg divide-y divide-gray-50">
          {members.map((a) => (
            <AttendanceRow key={a.id} a={a} onToggle={onToggle} isViewer={isViewer} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Rekap ───────────────────────────────────────────────
function RekapTab({ attendance }) {
  const byDept = useMemo(() => {
    const map = {};
    attendance.forEach((a) => {
      const d = a.manpower?.departemen || "Tanpa Departemen";
      if (!map[d]) map[d] = { hadir: 0, total: 0 };
      map[d].total++;
      if (a.status_hadir === "hadir") map[d].hadir++;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [attendance]);

  const totalHadir = attendance.filter((a) => a.status_hadir === "hadir").length;
  const pct = attendance.length > 0 ? Math.round((totalHadir / attendance.length) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* progress keseluruhan */}
      <div className="bg-[#e8eff8] rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-[#1d4f91]">Kehadiran Keseluruhan</p>
          <p className="text-sm font-bold text-[#1d4f91]">{pct}%</p>
        </div>
        <div className="w-full bg-white rounded-full h-3">
          <div
            className="h-3 rounded-full bg-[#1d4f91] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{totalHadir} hadir dari {attendance.length} total manpower</p>
      </div>

      {/* tabel per dept */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Departemen</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Hadir</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Tidak Hadir</th>
            <th className="text-center py-2 px-3 text-xs font-semibold text-gray-400 uppercase">Total</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {byDept.map(([dept, s]) => {
            const p = Math.round((s.hadir / s.total) * 100);
            return (
              <tr key={dept} className="hover:bg-gray-50">
                <td className="py-2.5 px-3 font-medium text-[#1C1D22]">{dept}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-green-600 font-semibold">{s.hadir}</span>
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className="text-[#CC5F5F] font-semibold">{s.total - s.hadir}</span>
                </td>
                <td className="py-2.5 px-3 text-center text-gray-500">{s.total}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#1d4f91]" style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8">{p}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* daftar tidak hadir */}
      <div>
        <p className="text-sm font-semibold text-[#1C1D22] mb-2">
          Daftar Tidak Hadir ({attendance.filter((a) => a.status_hadir !== "hadir").length})
        </p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {attendance
            .filter((a) => a.status_hadir !== "hadir")
            .sort((a, b) => (a.manpower?.departemen || "").localeCompare(b.manpower?.departemen || ""))
            .map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2 bg-red-50/50 rounded-md">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1C1D22] truncate">{a.manpower?.nama}</p>
                  <p className="text-xs text-gray-400">{a.manpower?.no_badge} · {a.manpower?.departemen || "-"}</p>
                </div>
              </div>
            ))}
          {attendance.filter((a) => a.status_hadir !== "hadir").length === 0 && (
            <p className="text-sm text-green-600 font-medium text-center py-4">Semua hadir!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Halaman utama ───────────────────────────────────────────
export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isViewer } = useRole();
  const [session, setSession]       = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [keyword, setKeyword]       = useState("");
  const [filterDept, setFilterDept] = useState("semua");
  const [activeTab, setActiveTab]   = useState("input"); // "input" | "rekap"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, att] = await Promise.all([
        meetingAPI.fetchSessionById(id),
        meetingAPI.fetchAttendanceBySession(id),
      ]);
      setSession(s);
      setAttendance(att);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Toggle satu orang ──────────────────────────────────
  const toggleHadir = useCallback(async (row) => {
    const newStatus = row.status_hadir === "hadir" ? "tidak_hadir" : "hadir";
    setAttendance((prev) => prev.map((a) => a.id === row.id ? { ...a, status_hadir: newStatus } : a));
    try {
      await meetingAPI.markAttendance(row.id, newStatus);
    } catch {
      load();
    }
  }, [load]);

  // ── Tandai banyak sekaligus ────────────────────────────
  const markAll = useCallback(async (members, toHadir) => {
    const newStatus = toHadir ? "hadir" : "tidak_hadir";
    const ids = members.map((m) => m.id);
    setAttendance((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, status_hadir: newStatus } : a));
    try {
      await Promise.all(members.map((m) => meetingAPI.markAttendance(m.id, newStatus)));
    } catch {
      load();
    }
  }, [load]);

  const totalHadir     = attendance.filter((a) => a.status_hadir === "hadir").length;
  const totalTidakHadir = attendance.length - totalHadir;

  const deptOptions = useMemo(() => {
    const depts = new Set(attendance.map((a) => a.manpower?.departemen).filter(Boolean));
    return Array.from(depts).sort();
  }, [attendance]);

  // ── Struktur grup: dept → list manpower (flat, karena tidak ada field supervisor) ──
  const deptGroups = useMemo(() => {
    const deptMap = {};
    attendance.forEach((a) => {
      const dept = a.manpower?.departemen || "Tanpa Departemen";
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(a);
    });

    return Object.entries(deptMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dept, members]) => ({
        dept,
        members: members.sort((a, b) => a.manpower.nama.localeCompare(b.manpower.nama)),
      }));
  }, [attendance]);

  // ── Filter untuk view list biasa ───────────────────────
  const filtered = useMemo(() => {
    return attendance
      .filter((a) => filterDept === "semua" || a.manpower?.departemen === filterDept)
      .filter((a) =>
        !keyword || `${a.manpower?.nama} ${a.manpower?.no_badge} ${a.manpower?.posisi}`
          .toLowerCase().includes(keyword.toLowerCase())
      );
  }, [attendance, filterDept, keyword]);

  // ── Export Excel rekap ─────────────────────────────────
  const doExport = async () => {
    const tgl = session?.tanggal_meeting
      ? new Date(session.tanggal_meeting).toLocaleDateString("id-ID")
      : id;
    await exportXlsx(`rekap-meeting-${session?.tanggal_meeting || id}.xlsx`, "Rekap Kehadiran", [
      { key: "no",     label: "No",          width: 6 },
      { key: "nama",   label: "Nama",         width: 28 },
      { key: "badge",  label: "No Badge",     width: 16 },
      { key: "posisi", label: "Posisi",        width: 26 },
      { key: "dept",   label: "Departemen",   width: 20 },
      { key: "status", label: "Status Hadir", width: 14 },
      { key: "tanggal",label: "Tanggal",      width: 14 },
    ], attendance
      .sort((a, b) => (a.manpower?.departemen || "").localeCompare(b.manpower?.departemen || "") || a.manpower?.nama.localeCompare(b.manpower?.nama))
      .map((a, i) => ({
        no:     i + 1,
        nama:   a.manpower?.nama || "",
        badge:  a.manpower?.no_badge || "",
        posisi: a.manpower?.posisi || "",
        dept:   a.manpower?.departemen || "",
        status: a.status_hadir === "hadir" ? "Hadir" : "Tidak Hadir",
        tanggal: tgl,
      }))
    );
  };

  if (loading) return <p className="p-6 text-sm text-gray-400">Memuat data sesi...</p>;
  if (!session) return <p className="p-6 text-sm text-gray-400">Sesi tidak ditemukan.</p>;

  const tglLabel = new Date(session.tanggal_meeting).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <PageHeader title={tglLabel} breadcrumb={["Kehadiran Meeting", "Detail Sesi"]}>
        <div className="flex gap-2">
          <AppButton type="ghost" onClick={() => navigate("/meetings")}>
            <LuArrowLeft className="inline mr-1" /> Kembali
          </AppButton>
          <AppButton type="ghost" onClick={doExport}>
            <LuDownload className="inline mr-1" /> Export Excel
          </AppButton>
        </div>
      </PageHeader>

      {/* Info sesi */}
      {(session.lokasi || session.keterangan) && (
        <div className="mx-4 mb-4">
          <AppCard className="p-4">
            <div className="space-y-2.5">
              {session.lokasi && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0 pt-0.5">Tempat</span>
                  <span className="text-xs text-gray-400 mr-1">:</span>
                  <span className="text-sm text-[#1C1D22] font-medium">{session.lokasi}</span>
                </div>
              )}
              {session.keterangan && (() => {
                // parse agenda dari JSON atau plain text
                let agendas = [];
                const str = session.keterangan.trim();
                if (str.startsWith("[")) {
                  try {
                    const parsed = JSON.parse(str);
                    if (Array.isArray(parsed)) agendas = parsed.map(s => String(s).trim()).filter(Boolean);
                  } catch {
                    agendas = str.replace(/^\[|\]$/g, "").split(/",\s*"/).map(s => s.replace(/^"|"$/g, "").trim()).filter(Boolean);
                  }
                } else {
                  agendas = str.split("\n").map(l => l.trim()).filter(Boolean);
                }
                return agendas.length > 0 ? (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-16 flex-shrink-0 pt-0.5">Agenda</span>
                    <span className="text-xs text-gray-400 mr-1">:</span>
                    <ol className="space-y-1 flex-1">
                      {agendas.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#1C1D22]">
                          <span className="font-semibold text-[#1d4f91] flex-shrink-0">{i + 1}.</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null;
              })()}
            </div>
          </AppCard>
        </div>
      )}

      {/* Stat cards */}
      <div className="mx-4 grid grid-cols-3 gap-3 mb-4">
        <AppCard className="p-4 text-center">
          <p className="text-2xl font-bold text-[#1C1D22]">{attendance.length}</p>
          <p className="text-xs text-gray-400">Total Manpower</p>
        </AppCard>
        <AppCard className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalHadir}</p>
          <p className="text-xs text-gray-400">Hadir</p>
          <p className="text-xs text-green-500 font-medium mt-0.5">
            {attendance.length > 0 ? Math.round((totalHadir / attendance.length) * 100) : 0}%
          </p>
        </AppCard>
        <AppCard className="p-4 text-center">
          <p className="text-2xl font-bold text-[#CC5F5F]">{totalTidakHadir}</p>
          <p className="text-xs text-gray-400">Tidak Hadir</p>
        </AppCard>
      </div>

      {/* Tab switcher */}
      <div className="mx-4 flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab("input")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "input" ? "bg-[#1d4f91] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#1d4f91]"
          }`}
        >
          <LuList size={14} /> Input Kehadiran
        </button>
        <button
          onClick={() => setActiveTab("rekap")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "rekap" ? "bg-[#1d4f91] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#1d4f91]"
          }`}
        >
          <LuLayoutList size={14} /> Rekap
        </button>
      </div>

      {/* ── Tab: Input Kehadiran ── */}
      {activeTab === "input" && (
        <AppCard className="mx-4">
          {/* toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama / no. badge..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91]"
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#1d4f91] bg-white"
            >
              <option value="semua">Semua Departemen</option>
              {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="p-4">
            {/* Mode grup (default, tampil jika tidak ada keyword/filter) */}
            {!keyword && filterDept === "semua" ? (
              <div>
                {deptGroups.map(({ dept, members }) => (
                  <DeptGroup
                    key={dept}
                    dept={dept}
                    members={members}
                    onToggle={toggleHadir}
                    onMarkAll={markAll}
                    isViewer={isViewer}
                  />
                ))}
              </div>
            ) : (
              /* Mode list (saat search/filter aktif) */
              <div className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <AttendanceRow key={a.id} a={a} onToggle={toggleHadir} isViewer={isViewer} />
                ))}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-gray-400 text-sm">Tidak ada data yang cocok</p>
                )}
              </div>
            )}
          </div>
        </AppCard>
      )}

      {/* ── Tab: Rekap ── */}
      {activeTab === "rekap" && (
        <AppCard className="mx-4">
          <RekapTab attendance={attendance} />
        </AppCard>
      )}
    </div>
  );
}
