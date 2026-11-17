import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LuArrowLeft, LuPrinter, LuDownload, LuFileText, LuUpload,
  LuPlus, LuTrash2, LuArrowUpRight, LuArrowDownLeft, LuCalendar,
  LuUser, LuMapPin, LuPackage, LuInfo, LuCircleCheck, LuCircleAlert,
} from "react-icons/lu";
import { assetAPI } from "../../services/assetAPI";
import { calibrationAPI } from "../../services/calibrationAPI";
import { storageAPI } from "../../services/storageAPI";
import { fmtDate, todayISO, printPGD } from "../../lib/helpers";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import InputField from "../../components/common/InputField";
import FormActions from "../../components/common/FormActions";
import StatusBadge from "../../components/common/StatusBadge";

const STATUS_CFG = {
  IN:  { label: "IN",  styles: "bg-green-100 text-green-600" },
  OUT: { label: "OUT", styles: "bg-amber-100 text-amber-700" },
};

// ── Info row sederhana untuk grid ─────────────────────────────
function InfoRow({ icon: Icon, label, value, badge }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50">
      {Icon && <Icon className="text-gray-400 text-sm mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {badge || <p className="text-sm font-medium text-[#1C1D22] truncate">{value || "-"}</p>}
      </div>
    </div>
  );
}

// ── Modal tambah kalibrasi + upload sertifikat ───────────────
function CalibrationModal({ item, onClose, onDone }) {
  const [form, setForm] = useState({
    tanggal_kalibrasi: todayISO(),
    tanggal_next_kalibrasi: "",
    keterangan: "",
  });
  const [certFile, setCertFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const handleSubmit = async () => {
    if (!form.tanggal_kalibrasi) { setError("Tanggal kalibrasi wajib diisi"); return; }
    setSaving(true);
    setError("");
    try {
      // Upload sertifikat PDF jika ada
      let certUrl = null;
      if (certFile) {
        certUrl = await storageAPI.uploadFile(certFile);
      }

      // 1. Buat record riwayat kalibrasi
      await calibrationAPI.create({
        asset_item_id: item.id,
        tanggal_kalibrasi: form.tanggal_kalibrasi,
        tanggal_next_kalibrasi: form.tanggal_next_kalibrasi || null,
        cal_cert_url: certUrl,
        keterangan: form.keterangan || null,
        dicatat_oleh: user?.nama || null,
      });

      // 2. Update asset_item dengan kalibrasi terbaru
      await assetAPI.updateItem(item.id, {
        tgl_kalibrasi: form.tanggal_kalibrasi,
        next_kalibrasi: form.tanggal_next_kalibrasi || null,
        cal_cert_url: certUrl || item.cal_cert_url || null,
      });

      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Gagal menyimpan kalibrasi.");
      setSaving(false);
    }
  };

  return (
    <AppModal show onClose={onClose}>
      <h3 className="text-lg font-semibold mb-1">Tambah Riwayat Kalibrasi</h3>
      <p className="text-xs text-gray-400 mb-4">PGD {item.kode_item}</p>
      {error && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-md p-2.5 mb-3">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tanggal Kalibrasi *</label>
          <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={form.tanggal_kalibrasi} onChange={(e) => setForm({ ...form, tanggal_kalibrasi: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tanggal Next Kalibrasi</label>
          <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={form.tanggal_next_kalibrasi} onChange={(e) => setForm({ ...form, tanggal_next_kalibrasi: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sertifikat Kalibrasi (PDF)</label>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => { setCertFile(e.target.files?.[0] || null); }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 border border-dashed border-gray-300 rounded-md p-3 text-sm text-gray-500 hover:border-[#1d4f91] hover:text-[#1d4f91] transition">
            <LuUpload className="text-base" />
            {certFile ? certFile.name : "Pilih file PDF sertifikat..."}
          </button>
        </div>
        <InputField name="keterangan" placeholder="Keterangan (opsional)"
          value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
      </div>
      <FormActions
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitLabel={saving ? "Menyimpan..." : "Simpan"}
        disabled={saving}
      />
    </AppModal>
  );
}

export default function PGDDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [calibrations, setCalibrations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCalModal, setShowCalModal] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [it, cals, txs] = await Promise.all([
        assetAPI.fetchItemWithHolder(id),
        calibrationAPI.fetchByItem(id),
        assetAPI.fetchTransactionsByItem(id),
      ]);
      setItem(it);
      setCalibrations(cals);
      setTransactions(txs);
    } catch (e) {
      console.error("Gagal load detail PGD:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Jika ada sertifikat PDF, buka sertifikat langsung di tab baru.
  // Jika tidak ada, cetak halaman data dari sistem (riwayat kalibrasi + in/out).
  const handlePrint = () => {
    if (item.cal_cert_url) {
      window.open(item.cal_cert_url, "_blank");
    } else {
      printPGD(item, calibrations, transactions);
    }
  };

  // Selalu print data sistem (untuk kebutuhan cetak laporan tanpa sertifikat)
  const handlePrintData = () => {
    printPGD(item, calibrations, transactions);
  };

  const handleDeleteCal = async (calId) => {
    if (!confirm("Hapus record kalibrasi ini?")) return;
    try {
      await calibrationAPI.remove(calId);
      setMsg({ type: "success", text: "Record kalibrasi dihapus." });
      load();
    } catch (e) {
      setMsg({ type: "error", text: "Gagal menghapus record." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[#1d4f91] text-sm">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1d4f91]" />
        Memuat detail PGD...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-gray-400 mb-4">Data PGD tidak ditemukan.</p>
        <AppButton type="ghost" onClick={() => navigate("/pgd")}>Kembali ke daftar</AppButton>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`PGD ${item.kode_item || ""}`} breadcrumb={["PGD", "Detail"]}>
        <div className="flex flex-wrap gap-2">
          <AppButton type="ghost" onClick={() => navigate("/pgd")}>
            <LuArrowLeft className="inline mr-1" /> Kembali
          </AppButton>
          {/* Jika ada sertifikat: tombol utama buka PDF sertifikat + tombol Print Data terpisah */}
          {item.cal_cert_url ? (
            <>
              <AppButton type="ghost" onClick={handlePrint} title="Buka & cetak sertifikat kalibrasi PDF">
                <LuFileText className="inline mr-1" /> Sertifikat
              </AppButton>
              <AppButton type="ghost" onClick={handlePrintData} title="Cetak halaman data PGD">
                <LuPrinter className="inline mr-1" /> Print Data
              </AppButton>
            </>
          ) : (
            <AppButton type="ghost" onClick={handlePrint} title="Cetak halaman data PGD">
              <LuPrinter className="inline mr-1" /> Print
            </AppButton>
          )}
          <AppButton type="primary" onClick={() => setShowCalModal(true)}>
            <LuPlus className="inline mr-1" /> Kalibrasi
          </AppButton>
        </div>
      </PageHeader>

      {/* Notifikasi */}
      {msg.text && (
        <div className={`mx-4 mb-3 flex items-center justify-between gap-3 text-sm rounded-md px-4 py-2.5 ${
          msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-[#CC5F5F]"
        }`}>
          <span className="flex items-center gap-2">
            {msg.type === "success" ? <LuCircleCheck /> : <LuCircleAlert />}
            {msg.text}
          </span>
          <button onClick={() => setMsg({ type: "", text: "" })} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      {/* ── Section 1: Informasi Alat ── */}
      <AppCard className="mx-4 mb-4">
        <div className="p-4 border-b border-gray-100">
          <p className="font-semibold text-[#1C1D22] text-sm flex items-center gap-2">
            <LuInfo className="text-[#1d4f91]" /> Informasi Alat
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow label="Nama / No PGD" value={item.kode_item} icon={LuPackage} />
            <InfoRow label="Serial Number" value={item.serial_number} />
            <InfoRow
              label="Status"
              icon={LuInfo}
              badge={<span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${STATUS_CFG[item.status]?.styles || "bg-gray-100 text-gray-600"}`}>{STATUS_CFG[item.status]?.label || item.status}</span>}
            />
            <InfoRow label="Pengguna" value={item.holder?.nama} icon={LuUser} />
            <InfoRow label="Lokasi / Area" value={item.lokasi_area} icon={LuMapPin} />
            <InfoRow label="Aksesori" value={item.aksesori} icon={LuPackage} />
          </div>
          <div>
            <InfoRow label="Date Out" value={fmtDate(item.tanggal_ambil)} icon={LuCalendar} />
            <InfoRow label="Tgl Kalibrasi" value={fmtDate(item.tgl_kalibrasi)} icon={LuCalendar} />
            <InfoRow label="Next Kalibrasi" value={fmtDate(item.next_kalibrasi)} icon={LuCalendar} />
            <InfoRow label="Project" value={item.project} />
            <InfoRow label="Keterangan" value={item.keterangan} />
            <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50">
              <LuFileText className="text-gray-400 text-sm mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Sertifikat Kalibrasi</p>
                {item.cal_cert_url ? (
                  <a href={item.cal_cert_url} target="_blank" rel="noreferrer"
                     className="text-sm text-[#1d4f91] hover:underline flex items-center gap-1 mt-0.5">
                    <LuFileText className="text-sm" /> Lihat / Unduh PDF
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 mt-0.5">Belum ada sertifikat</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      {/* ── Section 2: Riwayat Kalibrasi ── */}
      <AppCard className="mx-4 mb-4">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-[#1C1D22] text-sm flex items-center gap-2">
            <LuCalendar className="text-[#1d4f91]" /> Riwayat Kalibrasi
            <span className="text-xs text-gray-400 font-normal">({calibrations.length})</span>
          </p>
          <AppButton type="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setShowCalModal(true)}>
            <LuPlus className="inline mr-1" /> Tambah
          </AppButton>
        </div>
        <div className="p-4">
          {calibrations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada riwayat kalibrasi</p>
          ) : (
            <div className="space-y-2">
              {calibrations.map((c, idx) => (
                <div key={c.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  idx === 0 ? "bg-[#e8eff8]/50 border-[#1d4f91]/20" : "bg-gray-50 border-gray-100"
                }`}>
                  <div className="w-9 h-9 rounded-full bg-[#1d4f91]/10 flex items-center justify-center flex-shrink-0">
                    <LuCalendar className="text-[#1d4f91] text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1C1D22]">{fmtDate(c.tanggal_kalibrasi)}</p>
                      {idx === 0 && <span className="text-[10px] bg-[#1d4f91] text-white px-1.5 py-0.5 rounded-full">TERBARU</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      <p className="text-xs text-gray-500">Next: <span className="font-medium text-gray-700">{fmtDate(c.tanggal_next_kalibrasi)}</span></p>
                      {c.dicatat_oleh && <p className="text-xs text-gray-400">Oleh: {c.dicatat_oleh}</p>}
                    </div>
                    {c.keterangan && <p className="text-xs text-gray-500 mt-0.5 italic">"{c.keterangan}"</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {c.cal_cert_url ? (
                        <a href={c.cal_cert_url} target="_blank" rel="noreferrer"
                           className="text-xs text-[#1d4f91] hover:underline flex items-center gap-1">
                          <LuFileText className="text-xs" /> Sertifikat PDF
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">Tidak ada sertifikat</span>
                      )}
                      <button onClick={() => handleDeleteCal(c.id)}
                        className="text-xs text-[#CC5F5F] hover:underline flex items-center gap-0.5">
                        <LuTrash2 className="text-xs" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppCard>

      {/* ── Section 3: Riwayat Penggunaan (In/Out) ── */}
      <AppCard className="mx-4">
        <div className="p-4 border-b border-gray-100">
          <p className="font-semibold text-[#1C1D22] text-sm flex items-center gap-2">
            <LuArrowUpRight className="text-[#1d4f91]" /> Riwayat Penggunaan (In/Out)
            <span className="text-xs text-gray-400 font-normal">({transactions.length})</span>
          </p>
        </div>
        <div className="p-4">
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada riwayat penggunaan</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isOut = tx.jenis_transaksi === "out";
                return (
                  <div key={tx.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isOut ? "bg-amber-50/50 border-amber-100" : "bg-green-50/50 border-green-100"
                  }`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isOut ? "bg-amber-100" : "bg-green-100"
                    }`}>
                      {isOut ? <LuArrowUpRight className="text-amber-600 text-sm" /> : <LuArrowDownLeft className="text-green-600 text-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1C1D22]">
                          {isOut ? "Diserahkan" : "Dikembalikan"}
                        </p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isOut ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                        }`}>
                          {isOut ? "OUT" : "IN"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {tx.manpower?.nama || "—"}
                        {tx.manpower?.no_badge && <span className="text-xs text-gray-400 ml-1.5">({tx.manpower.no_badge})</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        <p className="text-xs text-gray-500">Tgl keluar: <span className="font-medium text-gray-700">{fmtDate(tx.tanggal_transaksi)}</span></p>
                        {tx.tanggal_kembali && <p className="text-xs text-gray-500">Tgl kembali: <span className="font-medium text-gray-700">{fmtDate(tx.tanggal_kembali)}</span></p>}
                      </div>
                      {tx.keterangan && <p className="text-xs text-gray-400 mt-0.5 italic">"{tx.keterangan}"</p>}
                      {tx.ditandai_oleh && <p className="text-xs text-gray-400 mt-0.5">Dicatat oleh: {tx.ditandai_oleh}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppCard>

      {/* ── Modal Tambah Kalibrasi ── */}
      {showCalModal && (
        <CalibrationModal
          item={item}
          onClose={() => setShowCalModal(false)}
          onDone={() => { setShowCalModal(false); load(); setMsg({ type: "success", text: "Kalibrasi berhasil ditambahkan." }); }}
        />
      )}
    </div>
  );
}
