import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LuUsers, LuClipboardCheck, LuCircleAlert, LuCircleCheck,
  LuIdCard, LuChevronRight, LuCalendar,
} from "react-icons/lu";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";
import { manpowerAPI } from "../../services/manpowerAPI";
import { meetingAPI } from "../../services/meetingAPI";
import { assetAPI } from "../../services/assetAPI";
import { pgdAPI } from "../../services/pgdAPI";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";

// ── Icon PGD custom ────────────────────────────────────────
function IconPGD({ color = "#1d4f91" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="3" stroke={color} strokeWidth="1.5" />
      <rect x="8.5" y="5" width="7" height="4.5" rx="0.5" stroke={color} strokeWidth="1.2" />
      <line x1="10" y1="6.5" x2="13.5" y2="6.5" stroke={color} strokeWidth="1" />
      <line x1="10" y1="8" x2="12" y2="8" stroke={color} strokeWidth="1" />
      <circle cx="12" cy="14" r="2" stroke={color} strokeWidth="1.2" />
      <line x1="9.5" y1="18.5" x2="14.5" y2="18.5" stroke={color} strokeWidth="1" />
    </svg>
  );
}

// ── Jam real-time ──────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tgl = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const jam = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <LuCalendar size={14} className="text-[#1d4f91]" />
      <span>{tgl}</span>
      <span className="font-semibold text-[#1d4f91] tabular-nums">{jam}</span>
    </div>
  );
}

// ── Donut chart kecil ──────────────────────────────────────
function DonutChart({ data, size = 80 }) {
  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        cx={size / 2 - 1}
        cy={size / 2 - 1}
        innerRadius={size * 0.3}
        outerRadius={size * 0.46}
        dataKey="value"
        strokeWidth={0}
        isAnimationActive={false}
      >
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({ icon, label, value, sub, tone, onClick, chart, progress }) {
  const toneMap = {
    blue:   "bg-[#e8eff8]",
    green:  "bg-green-50",
    amber:  "bg-amber-50",
    red:    "bg-red-50",
  };
  const iconBg = toneMap[tone] || toneMap.blue;

  return (
    <AppCard
      className="p-4 cursor-pointer hover:shadow-md transition group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-md ${iconBg} flex items-center justify-center mb-3`}>
            {icon}
          </div>
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#1C1D22]">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {progress !== undefined && (
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#1d4f91] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {chart && <div className="flex-shrink-0 ml-2 opacity-80">{chart}</div>}
        {!chart && (
          <LuChevronRight
            size={14}
            className="text-gray-200 group-hover:text-[#1d4f91] transition mt-1 flex-shrink-0"
          />
        )}
      </div>
    </AppCard>
  );
}

// ── Custom tooltip bar chart ───────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-[#1C1D22] mb-0.5">{d.day}</p>
      <p className="text-[#1d4f91]">{d.hadir} hadir</p>
      <p className="text-gray-400">{d.total - d.hadir} tidak hadir</p>
      <p className="text-gray-500 font-medium">{d.pct}% kehadiran</p>
    </div>
  );
}

// ── Halaman utama ──────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading]               = useState(true);
  const [manpower, setManpower]             = useState([]);
  const [sessions, setSessions]             = useState([]);
  const [assets, setAssets]                 = useState([]);
  const [pgdItems, setPgdItems]             = useState([]);
  const [latestAttendance, setLatestAttendance] = useState([]);
  const [latestSession, setLatestSession]   = useState(null);
  const [trend, setTrend]                   = useState([]);
  const [welcomeMsg, setWelcomeMsg]         = useState("");

  useEffect(() => {
    if (location.state?.loginSuccess) {
      const nama = location.state?.nama || "Admin";
      setWelcomeMsg(`Selamat datang kembali, ${nama}!`);
      window.history.replaceState({}, "");
      const t = setTimeout(() => setWelcomeMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  useEffect(() => {
    const load = async () => {
      try {
        const [mp, sess, items, pgdData] = await Promise.all([
          manpowerAPI.fetchAll(),
          meetingAPI.fetchSessions(),
          assetAPI.fetchItems(),
          pgdAPI.fetchAll(),
        ]);
        setManpower(mp);
        setSessions(sess);
        setAssets(items);
        setPgdItems(pgdData.items || []);

        if (sess.length > 0) {
          setLatestSession(sess[0]);
          const att = await meetingAPI.fetchAttendanceBySession(sess[0].id);
          setLatestAttendance(att);

          const last6 = sess.slice(0, 6).reverse();
          const trendData = await Promise.all(
            last6.map(async (s) => {
              const a    = await meetingAPI.fetchAttendanceBySession(s.id);
              const hadir = a.filter((x) => x.status_hadir === "hadir").length;
              const total = a.length;
              return {
                day:   new Date(s.tanggal_meeting).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
                hadir,
                total,
                pct: total ? Math.round((hadir / total) * 100) : 0,
              };
            })
          );
          setTrend(trendData);
        }
      } catch (err) {
        console.error("Gagal load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Statistik ──────────────────────────────────────────
  const totalAktif     = manpower.filter((m) => m.status !== "nonaktif").length;
  const latestHadir    = latestAttendance.filter((a) => a.status_hadir === "hadir").length;
  const latestTidak    = latestAttendance.length - latestHadir;
  const persenHadir    = latestAttendance.length
    ? Math.round((latestHadir / latestAttendance.length) * 100) : 0;

  const today          = new Date();
  const pgd            = assets.filter((a) => a.category?.nama_kategori === "PGD");
  const pgdIN          = pgd.filter((a) => a.status === "IN").length;
  const pgdOUT         = pgd.filter((a) => a.status === "OUT").length;

  const pgdNeedCal     = pgdItems.filter((p) => {
    if (!p.next_kalibrasi) return false;
    return (new Date(p.next_kalibrasi) - today) / 86400000 <= 30;
  }).length;

  const kp             = assets.filter((a) => a.category?.nama_kategori === "KP");
  const kpExpired      = kp.filter((a) => a.tanggal_expired && new Date(a.tanggal_expired) < today).length;
  const kpExpiringSoon = kp.filter((a) => {
    if (!a.tanggal_expired) return false;
    const d = (new Date(a.tanggal_expired) - today) / 86400000;
    return d >= 0 && d <= 30;
  }).length;
  const kpOk           = kp.length - kpExpired - kpExpiringSoon;

  // donut data
  const pgdDonut = [
    { value: pgdIN,  color: "#22c55e" },
    { value: pgdOUT, color: "#f59e0b" },
    ...(pgdNeedCal > 0 ? [{ value: pgdNeedCal, color: "#CC5F5F" }] : []),
  ].filter((d) => d.value > 0);

  const kpDonut = [
    { value: kpOk,           color: "#22c55e" },
    { value: kpExpiringSoon, color: "#f59e0b" },
    { value: kpExpired,      color: "#CC5F5F" },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#1d4f91] text-sm">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1d4f91]" />
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Topbar */}
      <div className="mx-4 flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Dashboard" breadcrumb="Dashboard" />
        <div className="pb-4"><LiveClock /></div>
      </div>

      {/* Alert login */}
      {welcomeMsg && (
        <div className="mx-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LuCircleCheck className="text-green-500 flex-shrink-0" size={16} />
            <p className="text-sm text-green-800">{welcomeMsg}</p>
          </div>
          <button onClick={() => setWelcomeMsg("")} className="text-green-400 hover:text-green-600 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Alert warnings */}
      <div className="mx-4 space-y-2">
        {(kpExpired > 0 || kpExpiringSoon > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <LuCircleAlert className="text-amber-500 flex-shrink-0" size={15} />
            <p className="text-sm text-amber-800 flex-1">
              {kpExpired > 0 && <span className="font-semibold">{kpExpired} KP sudah expired</span>}
              {kpExpired > 0 && kpExpiringSoon > 0 && " · "}
              {kpExpiringSoon > 0 && <span>{kpExpiringSoon} KP akan expired dalam 30 hari</span>}
            </p>
            <button onClick={() => navigate("/kp")} className="text-xs text-amber-700 font-medium flex items-center gap-0.5 hover:underline flex-shrink-0">
              Lihat <LuChevronRight size={12} />
            </button>
          </div>
        )}
        {pgdNeedCal > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <LuCircleAlert className="text-[#CC5F5F] flex-shrink-0" size={15} />
            <p className="text-sm text-[#CC5F5F] flex-1">
              <span className="font-semibold">{pgdNeedCal} PGD</span> perlu kalibrasi (expired atau dalam 30 hari)
            </p>
            <button onClick={() => navigate("/pgd")} className="text-xs text-[#CC5F5F] font-medium flex items-center gap-0.5 hover:underline flex-shrink-0">
              Lihat <LuChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="mx-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<LuUsers className="text-[#1d4f91]" size={18} />}
          label="Manpower Aktif"
          value={totalAktif}
          sub={`${manpower.length} total terdaftar`}
          onClick={() => navigate("/manpower")}
        />
        <StatCard
          icon={<LuClipboardCheck className="text-[#1d4f91]" size={18} />}
          label="Kehadiran Terakhir"
          value={`${persenHadir}%`}
          sub={`${latestHadir} hadir · ${latestTidak} tidak hadir`}
          progress={persenHadir}
          onClick={() => navigate("/meetings")}
        />
        <StatCard
          icon={<LuIdCard className="text-[#1d4f91]" size={18} />}
          label="Kartu Pengemudi"
          value={kp.length}
          sub={
            kpExpired > 0 ? `${kpExpired} expired` :
            kpExpiringSoon > 0 ? `${kpExpiringSoon} segera expired` :
            "Semua berlaku"
          }
          onClick={() => navigate("/kp")}
          chart={kpDonut.length > 0 ? <DonutChart data={kpDonut} size={76} /> : undefined}
        />
        <StatCard
          icon={<IconPGD />}
          label="Personal Gas Detector"
          value={pgd.length}
          sub={`${pgdIN} IN · ${pgdOUT} OUT${pgdNeedCal > 0 ? ` · ${pgdNeedCal} perlu kalibrasi` : ""}`}
          onClick={() => navigate("/pgd")}
          chart={pgdDonut.length > 0 ? <DonutChart data={pgdDonut} size={76} /> : undefined}
        />
      </div>

      {/* ── Chart + Legenda ── */}
      <div className="mx-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart tren — 2/3 lebar */}
        <AppCard className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-[#1C1D22] text-sm">Tren Kehadiran Weekly Meeting</p>
              <p className="text-xs text-gray-400 mt-0.5">6 sesi terakhir</p>
            </div>
            {trend.length > 0 && (
              <div className="text-right">
                <p className="text-xl font-bold text-[#1d4f91]">
                  {trend[trend.length - 1]?.pct}%
                </p>
                <p className="text-xs text-gray-400">sesi terbaru</p>
              </div>
            )}
          </div>
          {trend.length === 0 ? (
            <p className="text-xs text-gray-400 py-12 text-center">Belum ada data sesi meeting</p>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={trend} barSize={36} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc", radius: 6 }} />
                <Bar dataKey="hadir" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  {trend.map((_, i) => (
                    <Cell key={i} fill={i === trend.length - 1 ? "#1d4f91" : "#bcd0ea"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Total sesi meeting: <span className="font-semibold text-[#1C1D22]">{sessions.length}</span></p>
          </div>
        </AppCard>

        {/* Legenda status — 1/3 lebar */}
        <AppCard className="p-5 flex flex-col gap-5">
          <p className="font-semibold text-[#1C1D22] text-sm">Status Aset HSE</p>

          {/* KP */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kartu Pengemudi</p>
              <p className="text-xs text-gray-400">{kp.length} total</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: kp.length ? `${(kpOk / kp.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{kpOk} berlaku</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-amber-400" style={{ width: kp.length ? `${(kpExpiringSoon / kp.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{kpExpiringSoon} segera</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#CC5F5F] flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#CC5F5F]" style={{ width: kp.length ? `${(kpExpired / kp.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{kpExpired} expired</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* PGD */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PGD</p>
              <p className="text-xs text-gray-400">{pgd.length} unit</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: pgd.length ? `${(pgdIN / pgd.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{pgdIN} IN</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-amber-400" style={{ width: pgd.length ? `${(pgdOUT / pgd.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{pgdOUT} OUT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#CC5F5F] flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-[#CC5F5F]" style={{ width: pgd.length ? `${(pgdNeedCal / pgd.length) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{pgdNeedCal} kalibrasi</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-2 border-t border-gray-100" />
        </AppCard>

      </div>
    </div>
  );
}
