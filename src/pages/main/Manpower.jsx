import { useState, useEffect, useMemo, useRef } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuUpload, LuDownload, LuFileSpreadsheet, LuX, LuCircleAlert } from "react-icons/lu";
import { manpowerAPI } from "../../services/manpowerAPI";
import { exportXlsx, readXlsx, uniq } from "../../lib/helpers";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppTable from "../../components/common/AppTable";
import AppTableRow from "../../components/common/AppTableRow";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppAvatar from "../../components/common/AppAvatar";
import AppSelect from "../../components/common/AppSelect";
import InputField from "../../components/common/InputField";
import FormActions from "../../components/common/FormActions";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination, { usePaged } from "../../components/common/Pagination";

const emptyForm = { nama: "", no_badge: "", posisi: "", departemen: "", area: "", status: "aktif" };

const COLS = [
  { key: "nama", label: "Nama", width: 28 },
  { key: "no_badge", label: "No Badge", width: 14 },
  { key: "posisi", label: "Job Title", width: 26 },
  { key: "departemen", label: "Departemen", width: 18 },
  { key: "area", label: "Area", width: 16 },
  { key: "status", label: "Status", width: 12 },
];

// nama kolom Excel yang dikenali (huruf kecil) → field database
const ALIAS = {
  nama: ["nama", "name"],
  no_badge: ["no badge", "no. badge", "badge", "no_badge", "nomor badge"],
  posisi: ["job title", "jabatan", "posisi", "title"],
  departemen: ["departemen", "department", "dept"],
  area: ["area", "lokasi"],
  status: ["status"],
};
const pick = (row, keys) => { for (const k of keys) if (row[k]) return row[k]; return ""; };

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function Manpower() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [fDept, setFDept] = useState("");
  const [fArea, setFArea] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await manpowerAPI.fetchAll());
    } catch (err) {
      console.error(err);
      setNotice("Gagal memuat data. Cek koneksi / file .env Supabase.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const depts = useMemo(() => uniq(data.map((m) => m.departemen)), [data]);
  const areas = useMemo(() => uniq(data.map((m) => m.area)), [data]);

  const filtered = useMemo(() => {
    const q = keyword.toLowerCase();
    return data.filter((m) =>
      (!q || `${m.nama} ${m.no_badge} ${m.posisi || ""}`.toLowerCase().includes(q)) &&
      (!fDept || m.departemen === fDept) &&
      (!fArea || m.area === fArea) &&
      (!fStatus || m.status === fStatus)
    );
  }, [data, keyword, fDept, fArea, fStatus]);

  const paged = usePaged(filtered, 10);
  const hasFilter = keyword || fDept || fArea || fStatus;
  const resetFilter = () => { setKeyword(""); setFDept(""); setFArea(""); setFStatus(""); };

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setError(""); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ nama: m.nama, no_badge: m.no_badge, posisi: m.posisi || "", departemen: m.departemen || "", area: m.area || "", status: m.status });
    setEditingId(m.id); setError(""); setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.nama.trim() || !form.no_badge.trim()) { setError("Nama dan nomor badge wajib diisi"); return; }
    try {
      const payload = { ...form, nama: form.nama.trim(), no_badge: form.no_badge.trim() };
      if (editingId) await manpowerAPI.update(editingId, payload);
      else await manpowerAPI.create(payload);
      setShowModal(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "";
      if (msg.includes("manpower_no_badge_key") || msg.includes("unique")) {
        setError(`No badge "${form.no_badge.trim()}" sudah digunakan oleh manpower lain. Gunakan nomor badge yang berbeda.`);
      } else {
        setError("Gagal menyimpan. Silakan coba lagi.");
      }
    }
  };

  const handleDelete = async (m) => {
    await manpowerAPI.remove(m.id);
    load();
  };

  const doExport = () => exportXlsx("data-manpower.xlsx", "Manpower", COLS, filtered);
  const doTemplate = () =>
    exportXlsx("template-manpower.xlsx", "Manpower", COLS, [
      { nama: "Contoh Nama", no_badge: "WKS-0001", posisi: "HSE Officer", departemen: "HSE", area: "Duri Area 1", status: "aktif" },
    ]);

  const doImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNotice("");
    try {
      const rows = await readXlsx(file);
      const have = new Set(data.map((m) => m.no_badge.toLowerCase()));
      const items = [];
      let skip = 0;
      for (const r of rows) {
        const o = Object.fromEntries(Object.entries(ALIAS).map(([k, a]) => [k, pick(r, a)]));
        if (!o.nama || !o.no_badge || have.has(o.no_badge.toLowerCase())) { skip++; continue; }
        have.add(o.no_badge.toLowerCase());
        o.status = o.status.toLowerCase() === "nonaktif" ? "nonaktif" : "aktif";
        items.push(o);
      }
      if (items.length) await manpowerAPI.createMany(items);
      setNotice(`Import selesai: ${items.length} data ditambahkan${skip ? `, ${skip} dilewati (kosong / no badge sudah ada)` : ""}.`);
      load();
    } catch (err) {
      console.error(err);
      setNotice("Import gagal. Pastikan file .xlsx dengan header: Nama, No Badge, Job Title, Departemen, Area, Status.");
    }
  };

  return (
    <div>
      <PageHeader title="Data Manpower" breadcrumb="Manpower">
        <div className="flex flex-wrap gap-2 justify-end">
          <AppButton type="ghost" onClick={doTemplate}><LuFileSpreadsheet className="inline mr-1" />Template</AppButton>
          <AppButton type="ghost" onClick={() => fileRef.current?.click()}><LuUpload className="inline mr-1" />Import Excel</AppButton>
          <AppButton type="ghost" onClick={doExport}><LuDownload className="inline mr-1" />Export Excel</AppButton>
          <AppButton type="primary" onClick={openCreate}><LuPlus className="inline mr-1" />Tambah Manpower</AppButton>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={doImport} />
        </div>
      </PageHeader>

      {notice && (
        <div className="mx-4 mb-3 flex items-start justify-between gap-3 bg-[#e8eff8] text-[#1d4f91] text-sm rounded-md px-4 py-2.5">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Tutup"><LuX size={16} /></button>
        </div>
      )}

      <AppCard className="mx-4">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama, no badge, atau job title"
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91]" />
          </div>
          <AppSelect value={fDept} onChange={(e) => setFDept(e.target.value)}>
            <option value="">Semua departemen</option>{depts.map((d) => <option key={d}>{d}</option>)}
          </AppSelect>
          <AppSelect value={fArea} onChange={(e) => setFArea(e.target.value)}>
            <option value="">Semua area</option>{areas.map((d) => <option key={d}>{d}</option>)}
          </AppSelect>
          <AppSelect value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option>
          </AppSelect>
          {hasFilter && <AppButton type="ghost" onClick={resetFilter}>Reset</AppButton>}
        </div>
        {/* Info jumlah data */}
        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-400">
          Menampilkan <span className="font-semibold text-[#1C1D22]">{filtered.length}</span> dari <span className="font-semibold text-[#1C1D22]">{data.length}</span> manpower
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-400 text-center">Memuat data...</p>
        ) : (
          <>
            <AppTable headers={["Nama", "No Badge", "Job Title", "Departemen", "Area", "Status", ""]}>
              {paged.slice.map((m) => (
                <AppTableRow key={m.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <AppAvatar name={m.nama} size="sm" />
                      <span className="font-medium text-[#1C1D22]">{m.nama}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{m.no_badge}</td>
                  <td className="px-5 py-3 text-gray-600">{m.posisi || "-"}</td>
                  <td className="px-5 py-3 text-gray-600">{m.departemen || "-"}</td>
                  <td className="px-5 py-3 text-gray-600">{m.area || "-"}</td>
                  <td className="px-5 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(m)} aria-label="Edit" className="text-[#1d4f91] hover:bg-[#e8eff8] p-1.5 rounded-md"><LuPencil size={16} /></button>
                      <button onClick={() => setDeleteItem(m)} aria-label="Hapus" className="text-[#CC5F5F] hover:bg-red-50 p-1.5 rounded-md"><LuTrash2 size={16} /></button>
                    </div>
                  </td>
                </AppTableRow>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">Tidak ada data</td></tr>
              )}
            </AppTable>
            <Pagination p={paged} />
          </>
        )}
      </AppCard>

      <AppModal show={showModal} onClose={() => setShowModal(false)}>
        <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit Manpower" : "Tambah Manpower"}</h3>
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg p-3 mb-3">
            <LuCircleAlert className="text-[#CC5F5F] flex-shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-[#CC5F5F]">{error}</p>
          </div>
        )}
        <div className="space-y-3">
          <Field label="Nama lengkap"><InputField name="nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No badge"><InputField name="no_badge" value={form.no_badge} onChange={(e) => setForm({ ...form, no_badge: e.target.value })} /></Field>
            <Field label="Status">
              <AppSelect className="w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option>
              </AppSelect>
            </Field>
          </div>
          <Field label="Job title"><InputField name="posisi" placeholder="mis. HSE Officer, Driver" value={form.posisi} onChange={(e) => setForm({ ...form, posisi: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Departemen"><InputField name="departemen" placeholder="mis. HSE" value={form.departemen} onChange={(e) => setForm({ ...form, departemen: e.target.value })} /></Field>
            <Field label="Area"><InputField name="area" placeholder="mis. Duri Area 1" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Field>
          </div>
        </div>
        <FormActions onCancel={() => setShowModal(false)} onSubmit={handleSubmit} />
      </AppModal>

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteItem && (
        <AppModal show onClose={() => setDeleteItem(null)}>
          <h3 className="text-lg font-semibold mb-2">Hapus Manpower</h3>
          <p className="text-sm text-gray-500 mb-4">
            Apakah Anda yakin ingin menghapus{" "}
            <span className="font-semibold text-[#1C1D22]">{deleteItem.nama}</span>?
            Riwayat kehadiran terkait juga akan terhapus. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <AppButton type="ghost" onClick={() => setDeleteItem(null)}>Batal</AppButton>
            <AppButton type="danger" onClick={async () => {
              await handleDelete(deleteItem);
              setDeleteItem(null);
            }}>Hapus</AppButton>
          </div>
        </AppModal>
      )}
    </div>
  );
}
