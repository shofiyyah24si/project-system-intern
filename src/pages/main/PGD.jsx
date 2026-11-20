import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LuPlus, LuPencil, LuTrash2, LuSearch, LuDownload,
  LuHistory, LuArrowUpRight, LuArrowDownLeft, LuEye,
  LuPrinter, LuFileText, LuX, LuUpload, LuChevronUp, LuChevronDown,
  LuCalendar, LuInfo, LuCircleCheck, LuCircleAlert,
} from "react-icons/lu";
import { pgdAPI } from "../../services/pgdAPI";
import { storageAPI } from "../../services/storageAPI";
import { exportXlsx, fmtDate, todayISO, calExpInfo } from "../../lib/helpers";
import { useRole } from "../../lib/useRole";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import InputField from "../../components/common/InputField";
import FormActions from "../../components/common/FormActions";
import StatusBadge from "../../components/common/StatusBadge";
import StatCard from "../../components/common/StatCard";
import Pagination, { usePaged } from "../../components/common/Pagination";

const STATUS_CFG = {
  IN:  { label: "IN",  styles: "bg-green-100 text-green-600" },
  OUT: { label: "OUT", styles: "bg-amber-100 text-amber-700" },
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ACTIVITY_CFG = {
  create:      { label: "Dibuat",        icon: LuPlus,         color: "bg-green-100 text-green-600" },
  out:         { label: "Diserahkan",    icon: LuArrowUpRight, color: "bg-amber-100 text-amber-700" },
  in:          { label: "Dikembalikan",  icon: LuArrowDownLeft, color: "bg-green-100 text-green-600" },
  calibration: { label: "Kalibrasi",     icon: LuCalendar,     color: "bg-blue-100 text-blue-600" },
  edit:        { label: "Diedit",        icon: LuPencil,        color: "bg-gray-100 text-gray-600" },
  delete:      { label: "Dihapus",       icon: LuTrash2,        color: "bg-red-100 text-red-600" },
};

const emptyForm = {
  serial_number: "",
  date_calibration: "",
  next_calibration: "",
  project: "",
  remarks: "",
  cal_cert_url: "",
};

const Field = ({ label, children, error }) => (
  <div>
    <label className="text-xs text-gray-500 mb-1 block">{label}</label>
    {children}
    {error && <p className="text-xs text-[#CC5F5F] mt-1">{error}</p>}
  </div>
);

// ── Sortable column header ─────────────────────────────────
function SortHeader({ label, k, sortKey, sortDir, onSort }) {
  const active = sortKey === k;
  return (
    <button
      onClick={() => onSort(k)}
      className={`flex items-center gap-1 hover:text-[#1d4f91] transition ${active ? "text-[#1d4f91]" : ""}`}
    >
      {label}
      {active && (sortDir === "asc" ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />)}
    </button>
  );
}

// ── Modal View Details ──────────────────────────────────────
function ViewDetailsModal({ item, onClose }) {
  if (!item) return null;
  const exp = calExpInfo(item.next_kalibrasi);

  const DataRow = ({ label, value, badge }) => (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        {badge || <p className="text-sm font-medium text-[#1C1D22]">{value || "-"}</p>}
      </div>
    </div>
  );

  return (
    <AppModal show onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <LuEye className="text-[#1d4f91] text-lg" />
        <h3 className="text-base font-semibold text-[#1C1D22]">Detail PGD &mdash; {item.kode_item}</h3>
      </div>
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        <DataRow label="No PGD / Serial Number" value={item.serial_number || item.kode_item} />
        <DataRow label="Status" badge={
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${STATUS_CFG[item.status]?.styles || "bg-gray-100 text-gray-600"}`}>
            {STATUS_CFG[item.status]?.label || item.status}
          </span>
        } />
        <DataRow label="Date Out" value={fmtDate(item.date_out)} />
        <DataRow label="Date Calibration" value={fmtDate(item.tgl_kalibrasi)} />
        <DataRow label="Next Calibration" value={fmtDate(item.next_kalibrasi)} />
        <DataRow label="Days Expired" badge={
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${exp.styles}`}>{exp.label}</span>
        } />
        <DataRow label="Project" value={item.project} />
        <DataRow label="Remarks" value={item.keterangan} />
        <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400">Sertifikat Kalibrasi</p>
            {item.cal_cert_url ? (
              <a href={item.cal_cert_url} target="_blank" rel="noreferrer"
                className="text-sm text-[#1d4f91] hover:underline flex items-center gap-1 mt-0.5">
                <LuFileText size={14} /> Lihat / Unduh PDF
              </a>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">Belum ada sertifikat</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <AppButton type="ghost" onClick={onClose}>Tutup</AppButton>
      </div>
    </AppModal>
  );
}

// ── Modal Out (serahkan) ─────────────────────────────────────
function CheckOutModal({ item, manpower, onClose, onDone }) {
  const [manpowerId, setManpowerId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!manpowerId) { setError("Pilih manpower yang mengambil PGD"); return; }
    if (!date) { setError("Tanggal wajib diisi"); return; }
    setSaving(true);
    setError("");
    try {
      const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
      await pgdAPI.checkOut(item.id, {
        date,
        manpowerId: Number(manpowerId),
        notes: notes.trim(),
        userName: user?.nama || null,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Gagal menyimpan.");
      setSaving(false);
    }
  };

  return (
    <AppModal show onClose={onClose}>
      <h3 className="text-lg font-semibold mb-1">Serahkan PGD {item.kode_item}</h3>
      <p className="text-sm text-gray-400 mb-4">Status akan diubah menjadi OUT</p>
      {error && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-md p-2.5 mb-3">{error}</p>}
      <div className="space-y-3">
        <Field label="Nama Manpower *">
          <AppSelect className="w-full" value={manpowerId}
            onChange={(e) => setManpowerId(e.target.value)}>
            <option value="">Pilih manpower…</option>
            {manpower.map((m) => (
              <option key={m.id} value={m.id}>{m.nama} ({m.no_badge})</option>
            ))}
          </AppSelect>
        </Field>
        <Field label="Tanggal Pengambilan *">
          <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Catatan / Tujuan (opsional)">
          <input type="text" placeholder="mis. Digunakan untuk pekerjaan area X"
            className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <FormActions onCancel={onClose} onSubmit={handleSubmit}
        submitLabel={saving ? "Menyimpan..." : "Konfirmasi"} disabled={saving} />
    </AppModal>
  );
}

// ── Modal In (kembalikan) ───────────────────────────────────
function CheckInModal({ item, onClose, onDone }) {
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!date) { setError("Tanggal wajib diisi"); return; }
    setSaving(true);
    setError("");
    try {
      const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
      await pgdAPI.checkIn(item.id, {
        date,
        manpowerId: item.manpower_id || null,
        notes: notes.trim(),
        userName: user?.nama || null,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.message || "Gagal menyimpan.");
      setSaving(false);
    }
  };

  return (
    <AppModal show onClose={onClose}>
      <h3 className="text-lg font-semibold mb-1">Kembalikan PGD {item.kode_item}</h3>
      <p className="text-sm text-gray-400 mb-4">Status akan diubah menjadi IN</p>
      {error && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-md p-2.5 mb-3">{error}</p>}
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-md p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Diambil oleh</span>
            <span className="font-medium text-[#1C1D22]">{item.holder?.nama || "-"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Tanggal pengambilan</span>
            <span className="font-medium text-[#1C1D22]">{fmtDate(item.date_out || item.tanggal_ambil)}</span>
          </div>
        </div>
        <Field label="Tanggal Kembali *">
          <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Catatan (opsional)">
          <input type="text" placeholder="Kondisi saat dikembalikan..."
            className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <FormActions onCancel={onClose} onSubmit={handleSubmit}
        submitLabel={saving ? "Menyimpan..." : "Konfirmasi"} disabled={saving} />
    </AppModal>
  );
}

// ── Modal Riwayat ───────────────────────────────────────────
function HistoryModal({ item, onClose }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item) return;
    setLoading(true);
    pgdAPI.fetchActivityLog(item.id)
      .then(setLog).catch(console.error).finally(() => setLoading(false));
  }, [item]);

  if (!item) return null;

  return (
    <AppModal show onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <LuHistory className="text-[#1d4f91] text-lg flex-shrink-0" />
        <div>
          <h3 className="text-base font-semibold text-[#1C1D22]">Riwayat &mdash; PGD {item.kode_item}</h3>
          <p className="text-xs text-gray-400">Semua aktivitas terkait PGD ini</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[#1d4f91] text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1d4f91]" />
          Memuat riwayat...
        </div>
      ) : log.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Belum ada riwayat untuk PGD ini.</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {log.map((entry) => {
            const cfg = ACTIVITY_CFG[entry.jenis] || { label: entry.jenis, icon: LuInfo, color: "bg-gray-100 text-gray-600" };
            const Icon = cfg.icon;
            return (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon className="text-base" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#1C1D22]">{cfg.label}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{fmtDate(entry.tanggal)}</span>
                  </div>
                  {entry.keterangan && <p className="text-xs text-gray-500 mt-0.5">{entry.keterangan}</p>}
                  {entry.manpower && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {entry.manpower.nama || "\u2014"}
                      {entry.manpower.no_badge && <span className="text-gray-400 ml-1">({entry.manpower.no_badge})</span>}
                    </p>
                  )}
                  {entry.tanggal_kembali && (
                    <p className="text-xs text-gray-500 mt-0.5">Tgl kembali: <span className="font-medium">{fmtDate(entry.tanggal_kembali)}</span></p>
                  )}
                  {entry.next_kalibrasi && (
                    <p className="text-xs text-gray-500 mt-0.5">Next: <span className="font-medium">{fmtDate(entry.next_kalibrasi)}</span></p>
                  )}
                  {entry.cal_cert_url && (
                    <a href={entry.cal_cert_url} target="_blank" rel="noreferrer"
                      className="text-xs text-[#1d4f91] hover:underline flex items-center gap-1 mt-0.5">
                      <LuFileText size={11} /> Sertifikat PDF
                    </a>
                  )}
                  {entry.user && <p className="text-xs text-gray-400 mt-0.5">Oleh: {entry.user}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <AppButton type="ghost" onClick={onClose}>Tutup</AppButton>
      </div>
    </AppModal>
  );
}

// ── Modal Konfirmasi Hapus ──────────────────────────────────
function DeleteConfirmModal({ item, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  if (!item) return null;
  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };
  return (
    <AppModal show onClose={onClose}>
      <h3 className="text-lg font-semibold mb-2">Hapus PGD</h3>
      <p className="text-sm text-gray-500 mb-4">
        Apakah Anda yakin ingin menghapus PGD{" "}
        <span className="font-semibold text-[#1C1D22]">{item.kode_item}</span>?
        Tindakan ini tidak dapat dibatalkan.
        {item.cal_cert_url && <span className="block mt-1 text-xs">File sertifikat PDF juga akan dihapus.</span>}
      </p>
      <div className="flex justify-end gap-2">
        <AppButton type="ghost" onClick={onClose} disabled={deleting}>Batal</AppButton>
        <AppButton type="danger" onClick={handleConfirm} disabled={deleting}>
          {deleting ? "Menghapus..." : "Hapus"}
        </AppButton>
      </div>
    </AppModal>
  );
}

// ── Halaman utama PGD ─────────────────────────────────────────
export default function PGD() {
  const { isViewer } = useRole();
  const [items, setItems]               = useState([]);
  const [manpower, setManpower]         = useState([]);
  const [category, setCategory]         = useState(null);
  const [loading, setLoading]           = useState(true);
  const [keyword, setKeyword]           = useState("");
  const [fStatus, setFStatus]           = useState("");
  const [fExpiry, setFExpiry]           = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [sortKey, setSortKey]           = useState("serial_number");
  const [sortDir, setSortDir]           = useState("asc");
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [fieldErrors, setFieldErrors]   = useState({});
  const [saving, setSaving]             = useState(false);
  const [certFile, setCertFile]         = useState(null);
  const [notice, setNotice]             = useState({ type: "", text: "" });
  const certFileRef = useRef(null);

  // Modals
  const [viewItem, setViewItem]         = useState(null);
  const [outItem, setOutItem]           = useState(null);
  const [inItem, setInItem]             = useState(null);
  const [historyItem, setHistoryItem]   = useState(null);
  const [deleteItem, setDeleteItem]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await pgdAPI.fetchAll();
      setItems(r.items);
      setManpower(r.manpower);
      setCategory(r.category);
    } catch (e) {
      console.error(e);
      setNotice({ type: "error", text: "Gagal memuat data PGD." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Compute Days Expired per row ────────────────────────
  const rows = useMemo(
    () => items.map((i) => ({ ...i, calInfo: calExpInfo(i.next_kalibrasi) })),
    [items]
  );

  // ── Filter by keyword ───────────────────────────────────
  const filtered = useMemo(() => {
    const q = keyword.toLowerCase();
    return rows.filter((r) => {
      const matchQ = !q || `${r.kode_item || ""} ${r.serial_number || ""}`.toLowerCase().includes(q);
      const matchStatus = !fStatus || r.status === fStatus;
      const matchExpiry = !fExpiry || (
        fExpiry === "expired"  ? r.calInfo.key === "overdue" :
        fExpiry === "soon"     ? r.calInfo.key === "soon"    :
        fExpiry === "ok"       ? r.calInfo.key === "ok"      : true
      );
      return matchQ && matchStatus && matchExpiry;
    });
  }, [rows, keyword, fStatus, fExpiry]);

  // ── Sort ────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case "serial_number":
          va = (a.kode_item || "").toLowerCase();
          vb = (b.kode_item || "").toLowerCase();
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "date_out":
          va = a.date_out || "";
          vb = b.date_out || "";
          if (!va && !vb) return 0;
          if (!va) return 1;
          if (!vb) return -1;
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "date_calibration":
          va = a.tgl_kalibrasi || "";
          vb = b.tgl_kalibrasi || "";
          if (!va && !vb) return 0;
          if (!va) return 1;
          if (!vb) return -1;
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "next_calibration":
          va = a.next_kalibrasi || "";
          vb = b.next_kalibrasi || "";
          if (!va && !vb) return 0;
          if (!va) return 1;
          if (!vb) return -1;
          return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
        case "days_expired":
          va = a.calInfo.days;
          vb = b.calInfo.days;
          if (va === null && vb === null) return 0;
          if (va === null) return 1;
          if (vb === null) return -1;
          return sortDir === "asc" ? va - vb : vb - va;
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const paged = usePaged(sorted, 10);

  // ── Stat counts ─────────────────────────────────────────
  const nIn   = items.filter((i) => i.status === "IN").length;
  const nOut  = items.filter((i) => i.status === "OUT").length;
  const nSoon = rows.filter((r) => ["soon", "overdue"].includes(r.calInfo.key)).length;

  const handleSort = (k) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  // ── Form handlers ──────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setCertFile(null);
    setEditingId(null);
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (r) => {
    setForm({
      serial_number: r.serial_number || r.kode_item || "",
      date_calibration: r.tgl_kalibrasi || "",
      next_calibration: r.next_kalibrasi || "",
      project: r.project || "",
      remarks: r.keterangan || "",
      cal_cert_url: r.cal_cert_url || "",
    });
    setCertFile(null);
    setEditingId(r.id);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const errors = { ...fieldErrors };
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      errors.cert = "File harus berformat PDF";
      setFieldErrors(errors);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      errors.cert = "Ukuran file maksimal 5 MB";
      setFieldErrors(errors);
      return;
    }
    errors.cert = "";
    setFieldErrors(errors);
    setCertFile(file);
  };

  const removeCertFile = () => {
    setCertFile(null);
    if (certFileRef.current) certFileRef.current.value = "";
    setFieldErrors({ ...fieldErrors, cert: "" });
  };

  const validate = async () => {
    const errors = {};
    if (!form.serial_number.trim())
      errors.serial_number = "No PGD / Serial Number wajib diisi";
    if (!form.date_calibration)
      errors.date_calibration = "Date Calibration wajib diisi";
    if (!form.next_calibration)
      errors.next_calibration = "Next Calibration wajib diisi";
    if (form.date_calibration && form.next_calibration && form.next_calibration < form.date_calibration)
      errors.next_calibration = "Next Calibration tidak boleh lebih awal dari Date Calibration";
    if (!editingId && !certFile && !form.cal_cert_url)
      errors.cert = "Sertifikat wajib diupload";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return false;

    // Cek duplikat serial number
    if (form.serial_number.trim()) {
      const dup = await pgdAPI.checkDuplicate(form.serial_number, editingId);
      if (dup) {
        setFieldErrors({ ...errors, serial_number: "No PGD / Serial Number sudah ada. Gunakan nomor lain." });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!category) {
      setNotice({ type: "error", text: 'Kategori "PGD" belum ada. Jalankan migration_v6_pgd.sql di Supabase.' });
      return;
    }
    const ok = await validate();
    if (!ok) return;

    setSaving(true);
    try {
      let certUrl = form.cal_cert_url;
      if (certFile) certUrl = await storageAPI.uploadFile(certFile);

      const basePayload = {
        kode_item: form.serial_number.trim(),
        nama_item: "PGD " + form.serial_number.trim(),
        serial_number: form.serial_number.trim(),
        tgl_kalibrasi: form.date_calibration || null,
        next_kalibrasi: form.next_calibration || null,
        cal_cert_url: certUrl || null,
        project: form.project.trim() || null,
        keterangan: form.remarks.trim() || null,
      };

      const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

      if (editingId) {
        await pgdAPI.update(editingId, basePayload, user?.nama || null);
        setNotice({ type: "success", text: "PGD berhasil diperbarui." });
      } else {
        const createPayload = { ...basePayload, asset_category_id: category.id, status: "IN" };
        await pgdAPI.create(createPayload, user?.nama || null);
        setNotice({ type: "success", text: "PGD berhasil ditambahkan." });
      }
      setShowModal(false);
      setCertFile(null);
      load();
    } catch (e) {
      setFieldErrors({ ...fieldErrors, _submit: e.response?.data?.message || "Gagal menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    try {
      const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
      await pgdAPI.logActivity(r.id, "delete", `PGD ${r.kode_item} dihapus`, user?.nama || null);
      await pgdAPI.remove(r.id, r.cal_cert_url);
      setNotice({ type: "success", text: "PGD berhasil dihapus." });
      load();
    } catch (e) {
      setNotice({ type: "error", text: "Gagal menghapus: " + (e.response?.data?.message || e.message) });
    }
  };

  const handlePrint = (r) => {
    if (!r.cal_cert_url) {
      setNotice({ type: "error", text: "Sertifikat belum diupload" });
      return;
    }
    window.open(r.cal_cert_url, "_blank");
  };

  // ── Export Excel ───────────────────────────────────────
  const doExport = () =>
    exportXlsx("data-pgd.xlsx", "PGD", [
      { key: "no",      label: "No PGD / Serial",   width: 22 },
      { key: "out",     label: "Date Out",           width: 14 },
      { key: "cal",     label: "Date Calibration",   width: 16 },
      { key: "next",    label: "Next Calibration",    width: 16 },
      { key: "exp",     label: "Days Expired",       width: 18 },
      { key: "status",  label: "Status",             width: 10 },
      { key: "project", label: "Project",            width: 20 },
      { key: "remarks", label: "Remarks",            width: 24 },
    ], sorted.map((r) => ({
      no:      r.kode_item || "",
      out:     fmtDate(r.date_out),
      cal:     fmtDate(r.tgl_kalibrasi),
      next:    fmtDate(r.next_kalibrasi),
      exp:     r.calInfo.label,
      status:  STATUS_CFG[r.status]?.label || r.status,
      project: r.project || "",
      remarks: r.keterangan || "",
    })));

  return (
    <div>
      <PageHeader title="Personal Gas Detector (PGD)" breadcrumb="PGD">
        <div className="flex gap-2">
          <AppButton type="ghost" onClick={doExport}><LuDownload className="inline mr-1" />Export Excel</AppButton>
          {!isViewer && (
            <AppButton type="primary" onClick={openCreate}><LuPlus className="inline mr-1" />Tambah PGD</AppButton>
          )}
        </div>
      </PageHeader>

      {/* Notifikasi */}
      {notice.text && (
        <div className={`mx-4 mb-3 flex items-center justify-between gap-3 text-sm rounded-md px-4 py-2.5 ${
          notice.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-[#CC5F5F]"
        }`}>
          <span className="flex items-center gap-2">
            {notice.type === "success" ? <LuCircleCheck /> : <LuCircleAlert />}
            {notice.text}
          </span>
          <button onClick={() => setNotice({ type: "", text: "" })} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="mx-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total PGD"       value={items.length} />
        <StatCard label="Status IN"       value={nIn}   tone="green" />
        <StatCard label="Status OUT"      value={nOut}  tone="amber" />
        <StatCard label="Perlu Kalibrasi" value={nSoon} tone="red" />
      </div>

      <AppCard className="mx-4">
        {/* Search + Filter */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari no PGD / serial number"
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91]" />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-600 hover:border-[#1d4f91] hover:text-[#1d4f91] transition">
              Filter
              {showFilters ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-1">
              <AppSelect value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">Semua status</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </AppSelect>
              <AppSelect value={fExpiry} onChange={(e) => setFExpiry(e.target.value)}>
                <option value="">Semua kalibrasi</option>
                <option value="ok">Masih berlaku</option>
                <option value="soon">Segera expired</option>
                <option value="expired">Sudah expired</option>
              </AppSelect>
              {(fStatus || fExpiry) && (
                <button onClick={() => { setFStatus(""); setFExpiry(""); }}
                  className="text-xs text-[#CC5F5F] hover:underline self-center">
                  Reset filter
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-400 text-center">Memuat data...</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <SortHeader label="No PGD / Serial Number" k="serial_number" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <SortHeader label="Date Out" k="date_out" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <SortHeader label="Date Calibration" k="date_calibration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <SortHeader label="Next Calibration" k="next_calibration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <SortHeader label="Days Expired" k="days_expired" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.slice.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      {/* No PGD / Serial Number */}
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#1C1D22]">{r.kode_item || "-"}</p>
                        <p className="text-xs text-gray-400">{r.holder?.nama || ""}</p>
                      </td>
                      {/* Date Out */}
                      <td className="px-5 py-3 text-gray-600 text-sm whitespace-nowrap">{fmtDate(r.date_out)}</td>
                      {/* Date Calibration */}
                      <td className="px-5 py-3 text-gray-600 text-sm whitespace-nowrap">{fmtDate(r.tgl_kalibrasi)}</td>
                      {/* Next Calibration */}
                      <td className="px-5 py-3 text-gray-600 text-sm whitespace-nowrap">{fmtDate(r.next_kalibrasi)}</td>
                      {/* Days Expired */}
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.calInfo.styles}`}>
                          {r.calInfo.label}
                        </span>
                      </td>
                      {/* Details */}
                      <td className="px-5 py-3">
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => handlePrint(r)} title="Cetak sertifikat PDF"
                            className="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition">
                            <LuPrinter size={12} /> Print
                          </button>
                          <button onClick={() => setViewItem(r)} title="Lihat detail"
                            className="bg-[#1d4f91] hover:bg-[#17407a] text-white px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition">
                            <LuEye size={12} /> View
                          </button>
                        </div>
                      </td>
                      {/* Aksi */}
                      <td className="px-5 py-3">
                        {!isViewer ? (
                          <div className="flex gap-1 flex-wrap items-center">
                            {r.status === "IN" ? (
                              <button onClick={() => setOutItem(r)} title="Serahkan PGD"
                                className="bg-amber-400 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-xs font-medium transition">
                                Out
                              </button>
                            ) : (
                              <button onClick={() => setInItem(r)} title="Kembalikan PGD"
                                className="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded text-xs font-medium transition">
                                In
                              </button>
                            )}
                            <button onClick={() => setHistoryItem(r)} title="Riwayat"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-medium transition flex items-center">
                              <LuHistory size={14} />
                            </button>
                            <button onClick={() => openEdit(r)} title="Edit"
                              className="bg-[#1d4f91] hover:bg-[#17407a] text-white px-2 py-1 rounded text-xs font-medium transition flex items-center">
                              <LuPencil size={14} />
                            </button>
                            <button onClick={() => setDeleteItem(r)} title="Hapus"
                              className="bg-[#CC5F5F] hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition flex items-center">
                              <LuTrash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setHistoryItem(r)} title="Riwayat"
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-medium transition flex items-center">
                            <LuHistory size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada data PGD</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination p={paged} />
          </>
        )}
      </AppCard>

      {/* ── Modal Tambah / Edit PGD ── */}
      <AppModal show={showModal} onClose={() => setShowModal(false)}>
        <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit PGD" : "Tambah PGD"}</h3>
        {fieldErrors._submit && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-md p-2.5 mb-3">{fieldErrors._submit}</p>}
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">

          <Field label="No PGD / Serial Number *" error={fieldErrors.serial_number}>
            <InputField
              name="serial_number"
              placeholder="mis. MA 224-018021"
              value={form.serial_number}
              onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date Calibration *" error={fieldErrors.date_calibration}>
              <input type="date"
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
                value={form.date_calibration}
                onChange={(e) => setForm({ ...form, date_calibration: e.target.value })} />
            </Field>
            <Field label="Next Calibration *" error={fieldErrors.next_calibration}>
              <input type="date"
                className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
                min={form.date_calibration || undefined}
                value={form.next_calibration}
                onChange={(e) => setForm({ ...form, next_calibration: e.target.value })} />
            </Field>
          </div>

          <Field label="Upload Sertifikat (PDF, maks 5 MB) *" error={fieldErrors.cert}>
            <input ref={certFileRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={handleFileChange} />
            <div className="space-y-2">
              <button type="button" onClick={() => certFileRef.current?.click()}
                className="w-full flex items-center gap-2 border border-dashed border-gray-300 rounded-md p-2.5 text-sm text-gray-500 hover:border-[#1d4f91] hover:text-[#1d4f91] transition">
                <LuUpload className="text-base flex-shrink-0" />
                <span className="truncate">
                  {certFile ? certFile.name : "Pilih file PDF sertifikat..."}
                </span>
              </button>
              {certFile && (
                <div className="flex items-center justify-between bg-[#e8eff8] rounded-md px-3 py-2">
                  <span className="text-xs text-[#1d4f91] flex items-center gap-1.5 truncate">
                    <LuFileText size={14} /> {certFile.name}
                    <span className="text-gray-400">({(certFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </span>
                  <button type="button" onClick={removeCertFile} className="text-[#CC5F5F] hover:text-red-600 flex-shrink-0">
                    <LuX size={16} />
                  </button>
                </div>
              )}
              {!certFile && form.cal_cert_url && (
                <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                  <a href={form.cal_cert_url} target="_blank" rel="noreferrer"
                    className="text-xs text-[#1d4f91] hover:underline flex items-center gap-1.5 truncate">
                    <LuFileText size={14} /> Sertifikat saat ini
                  </a>
                  <button type="button" onClick={() => setForm({ ...form, cal_cert_url: "" })}
                    className="text-[#CC5F5F] hover:text-red-600 text-xs flex-shrink-0">Hapus</button>
                </div>
              )}
            </div>
          </Field>

          <Field label="Project">
            <InputField name="project" placeholder="mis. RUR-MPN PROJECT"
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })} />
          </Field>

          <Field label="Remarks (opsional)">
            <textarea
              placeholder="Catatan tambahan..."
              rows={3}
              className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition resize-y"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </Field>
        </div>
        <FormActions
          onCancel={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Menyimpan..." : "Simpan"}
          disabled={saving}
        />
      </AppModal>

      {/* ── Modals ── */}
      {viewItem && <ViewDetailsModal item={viewItem} onClose={() => setViewItem(null)} />}
      {outItem && (
        <CheckOutModal item={outItem} manpower={manpower}
          onClose={() => setOutItem(null)}
          onDone={() => { setOutItem(null); load(); }} />
      )}
      {inItem && (
        <CheckInModal item={inItem}
          onClose={() => setInItem(null)}
          onDone={() => { setInItem(null); load(); }} />
      )}
      {historyItem && <HistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
      {deleteItem && (
        <DeleteConfirmModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={async () => {
            await handleDelete(deleteItem);
            setDeleteItem(null);
          }}
        />
      )}
    </div>
  );
}
