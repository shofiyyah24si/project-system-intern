import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LuUsers, LuClipboardCheck, LuPackageOpen, LuTriangleAlert, LuCircleCheck } from "react-icons/lu";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { manpowerAPI } from "../../services/manpowerAPI";
import { meetingAPI } from "../../services/meetingAPI";
import { assetAPI } from "../../services/assetAPI";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [manpower, setManpower] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [latestAttendance, setLatestAttendance] = useState([]);
  const [welcomeMsg, setWelcomeMsg] = useState("");

  // Tampilkan pesan selamat datang jika baru login
  useEffect(() => {
    if (location.state?.loginSuccess) {
      const nama = location.state?.nama || "Admin";
      setWelcomeMsg(`Login berhasil! Selamat datang, ${nama}.`);
      // Hapus state dari history agar tidak muncul lagi saat refresh/navigasi
      window.history.replaceState({}, "");
      // Auto-dismiss setelah 4 detik
      const t = setTimeout(() => setWelcomeMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  useEffect(() => {
    const load = async () => {
      try {
        const [mp, sess, items, exp0] = await Promise.all([
          manpowerAPI.fetchAll(),
          meetingAPI.fetchSessions(),
          assetAPI.fetchItems(),
          assetAPI.fetchExpiringSoon(30),
        ]);
        setManpower(mp);
        setSessions(sess);
        setAssets(items);
        setExpiring(exp0.filter((i) => i.category?.nama_kategori === "KP"));

        if (sess.length > 0) {
          const att = await meetingAPI.fetchAttendanceBySession(sess[0].id);
          setLatestAttendance(att);
        }
      } catch (err) {
        console.error("Gagal load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalManpowerAktif = manpower.filter((m) => m.status !== "nonaktif").length;
  const latestHadir = latestAttendance.filter((a) => a.status_hadir === "hadir").length;
  const latestTidakHadir = latestAttendance.length - latestHadir;
  const persenHadir = latestAttendance.length ? Math.round((latestHadir / latestAttendance.length) * 100) : 0;

  const pgd = assets.filter((a) => a.category?.nama_kategori === "PGD");
  const pgdTersedia = pgd.filter((a) => a.status === "tersedia").length;
  const pgdDipakai = pgd.filter((a) => a.status === "dipegang").length;

  // trend kehadiran 6 sesi terakhir untuk bar chart
  const [trend, setTrend] = useState([]);
  useEffect(() => {
    const loadTrend = async () => {
      const last6 = sessions.slice(0, 6).reverse();
      const results = await Promise.all(
        last6.map(async (s) => {
          const att = await meetingAPI.fetchAttendanceBySession(s.id);
          const hadir = att.filter((a) => a.status_hadir === "hadir").length;
          return { day: new Date(s.tanggal_meeting).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), value: hadir };
        })
      );
      setTrend(results);
    };
    if (sessions.length > 0) loadTrend();
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#1d4f91] text-sm">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1d4f91]" />
        Memuat dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" breadcrumb="Dashboard" />

      {/* Alert login berhasil */}
      {welcomeMsg && (
        <div className="mx-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <LuCircleCheck className="text-green-500 flex-shrink-0 text-base" />
            <p className="text-sm text-green-800">{welcomeMsg}</p>
          </div>
          <button
            onClick={() => setWelcomeMsg("")}
            className="text-green-500 hover:text-green-700 text-lg leading-none flex-shrink-0"
            aria-label="Tutup">
            &times;
          </button>
        </div>
      )}

      <div className="mx-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <AppCard className="p-4 cursor-pointer" onClick={() => navigate("/manpower")}>
          <div className="w-9 h-9 rounded-md bg-[#e8eff8] flex items-center justify-center mb-3">
            <LuUsers className="text-[#1d4f91] text-lg" />
          </div>
          <p className="text-xs text-gray-400 mb-1">Total Manpower Aktif</p>
          <p className="text-2xl font-bold text-[#1C1D22]">{totalManpowerAktif}</p>
        </AppCard>

        <AppCard className="p-4 cursor-pointer" onClick={() => navigate("/meetings")}>
          <div className="w-9 h-9 rounded-md bg-[#e8eff8] flex items-center justify-center mb-3">
            <LuClipboardCheck className="text-[#1d4f91] text-lg" />
          </div>
          <p className="text-xs text-gray-400 mb-1">Kehadiran Sesi Terakhir</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-[#1C1D22]">{latestHadir}<span className="text-sm text-gray-400">/{latestAttendance.length}</span></p>
            <p className="text-xs text-[#519C66] font-semibold mb-1">{persenHadir}%</p>
          </div>
        </AppCard>

        <AppCard className="p-4 cursor-pointer" onClick={() => navigate("/pgd")}>
          <div className="w-9 h-9 rounded-md bg-[#e8eff8] flex items-center justify-center mb-3">
            <LuPackageOpen className="text-[#1d4f91] text-lg" />
          </div>
          <p className="text-xs text-gray-400 mb-1">PGD Tersedia</p>
          <p className="text-2xl font-bold text-[#1C1D22]">{pgdTersedia}<span className="text-sm text-gray-400"> / {pgd.length}</span></p>
          <p className="text-xs text-gray-400 mt-0.5">{pgdDipakai} sedang dipakai</p>
        </AppCard>
      </div>

      {expiring.length > 0 && (
        <div className="mx-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <LuTriangleAlert className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              {expiring.length} aset (KP) akan expired dalam 30 hari ke depan
            </p>
            <p className="text-xs text-yellow-700 mt-1 cursor-pointer hover:underline" onClick={() => navigate("/kp")}>
              Lihat detail di halaman Kartu Pengemudi →
            </p>
          </div>
        </div>
      )}

      <div className="mx-4">
        <AppCard className="p-4">
          <p className="font-semibold text-[#1C1D22] text-sm mb-3">
            Tren Kehadiran (6 Sesi Terakhir)
          </p>
          {trend.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">Belum ada data sesi meeting</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barSize={28}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip formatter={(v) => [`${v} orang`, "Hadir"]} cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" fill="#1d4f91" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AppCard>
      </div>
    </div>
  );
}
