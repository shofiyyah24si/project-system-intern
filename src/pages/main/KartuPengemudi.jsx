import { useState, useEffect, useMemo } from "react";
import { LuPlus, LuPencil, LuTrash2, LuSearch, LuDownload, LuChevronDown, LuChevronUp } from "react-icons/lu";
import { assetAPI } from "../../services/assetAPI";
import { exportXlsx, fmtDate, daysUntil, todayISO } from "../../lib/helpers";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppTable from "../../components/common/AppTable";
import AppTableRow from "../../components/common/AppTableRow";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import AppSelect from "../../components/common/AppSelect";
import InputField from "../../components/common/InputField";
import FormActions from "../../components/common/FormActions";
import StatCard from "../../components/common/StatCard";
import Pagination, { usePaged } from "../../components/common/Pagination";

const TIPE_SIM_OPTIONS = ["A", "BI", "BII", "BIIU", "BIU", "C"];

// status permit dihitung dari tanggal expired
export function permitInfo(tglExpired) {
  const d = daysUntil(tglExpired);
  if (d === null) return { key: "none", label: "-", styles: "bg-gray-100 text-gray-500" };
  if (d < 0) return { key: "expired", label: `Expired ${-d} hari lalu`, styles: "bg-red-100 text-red-600" };
  if (d <= 30) return { key: "soon", label: `Sisa ${d} hari`, styles: "bg-amber-100 text-amber-700" };
  return { key: "ok", label: "Berlaku", styles: "bg-green-100 text-green-600" };
}

const emptyForm = {
  manpower_id: "",
  kode_item: "",
  id_card: "",
  tipe_sim: "",
  tanggal_ambil: todayISO(),
  tanggal_expired: "",
};

const Field = ({ label, children }) => (
  <div><label className="text-xs text-gray-500 mb-1 block">{label}</label>{children}</div>
);

export default function KartuPengemudi() {
  const [items, setItems] = useState([]);
  const [manpower, setManpower] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [fSim, setFSim] = useState("");
  const [fExpiry, setFExpiry] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await assetAPI.fetchByCategory("KP");
      setItems(r.items); setManpower(r.manpower); setCategory(r.category);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => items.map((i) => ({ ...i, permit: permitInfo(i.tanggal_expired) })), [items]);

  const filtered = useMemo(() => {
    const q = keyword.toLowerCase();
    return rows.filter((r) => {
      const matchQ      = !q       || `${r.holder?.nama || ""} ${r.kode_item || ""} ${r.holder?.no_badge || ""}`.toLowerCase().includes(q);
      const matchSim    = !fSim    || r.tipe_sim === fSim;
      const matchExpiry = !fExpiry || (
        fExpiry === "expired" ? r.permit.key === "expired" :
        fExpiry === "soon"    ? r.permit.key === "soon"    :
        fExpiry === "ok"      ? r.permit.key === "ok"      : true
      );
      return matchQ && matchSim && matchExpiry;
    });
  }, [rows, keyword, fSim, fExpiry]);

  const paged = usePaged(filtered, 10);

  const n = (k) => rows.filter((r) => r.permit.key === k).length;

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setError(""); setShowModal(true); };
  const openEdit = (r) => {
    setForm({
      manpower_id: r.manpower_id || "",
      kode_item: r.kode_item || "",
      id_card: r.id_card || "",
      tipe_sim: r.tipe_sim || "",
      tanggal_ambil: r.tanggal_ambil || "",
      tanggal_expired: r.tanggal_expired || "",
    });
    setEditingId(r.id); setError(""); setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.manpower_id || !form.kode_item.trim()) { setError("Nama pemegang dan nomor KP wajib diisi"); return; }
    if (!category) { setError('Kategori "KP" belum ada di database. Jalankan supabase/schema.sql dahulu.'); return; }
    const holder = manpower.find((m) => String(m.id) === String(form.manpower_id));
    const payload = {
      asset_category_id: category.id,
      manpower_id: Number(form.manpower_id),
      kode_item: form.kode_item.trim(),
      nama_item: `KP ${form.kode_item.trim()}${holder ? ` – ${holder.nama}` : ""}`,
      id_card: form.id_card.trim() || null,
      tipe_sim: form.tipe_sim || null,
      tanggal_ambil: form.tanggal_ambil || null,
      tanggal_expired: form.tanggal_expired || null,
      status: "dipegang",
    };
    try {
      if (editingId) await assetAPI.updateItem(editingId, payload);
      else await assetAPI.createItem(payload);
      setShowModal(false); load();
    } catch (e) {
      setError(e.response?.data?.message || "Gagal menyimpan. Pastikan migrasi supabase/migration_v3.sql sudah dijalankan.");
    }
  };

  const handleDelete = async (r) => {
    await assetAPI.removeItem(r.id); load();
  };

  const doExport = () =>
    exportXlsx("data-kp.xlsx", "KP", [
      { key: "nama",     label: "Nama",              width: 28 },
      { key: "badge",    label: "No Badge",           width: 16 },
      { key: "id_card",  label: "ID Card",            width: 20 },
      { key: "no",       label: "No KP",              width: 16 },
      { key: "sim",      label: "Tipe SIM",           width: 10 },
      { key: "ambil",    label: "Tgl Pengambilan",    width: 16 },
      { key: "exp",      label: "Permit Expired",     width: 16 },
      { key: "status",   label: "Status",             width: 14 },
    ], filtered.map((r) => ({
      nama:    r.holder?.nama || "",
      badge:   r.holder?.no_badge || "",
      id_card: r.id_card || "",
      no:      r.kode_item || "",
      sim:     r.tipe_sim || "",
      ambil:   fmtDate(r.tanggal_ambil),
      exp:     fmtDate(r.tanggal_expired),
      status:  r.status === "dipegang" ? "Aktif" : "Dikembalikan",
    })));

  return (
    <div>
      <PageHeader title="Kartu Pengemudi (KP)" breadcrumb="Kartu Pengemudi">
        <div className="flex gap-2">
          <AppButton type="ghost" onClick={doExport}><LuDownload className="inline mr-1" />Export Excel</AppButton>
          <AppButton type="primary" onClick={openCreate}><LuPlus className="inline mr-1" />Catat KP</AppButton>
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div className="mx-4 grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total KP"          value={rows.length} />
        <StatCard label="Permit berlaku"    value={n("ok")}      tone="green" />
        <StatCard label="Berakhir ≤ 30 hari" value={n("soon")}  tone="amber" />
        <StatCard label="Expired"           value={n("expired")} tone="red" />
      </div>

      <AppCard className="mx-4">
        {/* Search + filter bar */}
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama, no KP, atau badge"
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
              <AppSelect value={fExpiry} onChange={(e) => setFExpiry(e.target.value)}>
                <option value="">Semua permit</option>
                <option value="ok">Masih berlaku</option>
                <option value="soon">Segera expired</option>
                <option value="expired">Sudah expired</option>
              </AppSelect>
              <AppSelect value={fSim} onChange={(e) => setFSim(e.target.value)}>
                <option value="">Semua tipe SIM</option>
                {TIPE_SIM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </AppSelect>
              {(fExpiry || fSim) && (
                <button onClick={() => { setFExpiry(""); setFSim(""); }}
                  className="text-xs text-[#CC5F5F] hover:underline self-center">
                  Reset filter
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? <p className="p-6 text-sm text-gray-400 text-center">Memuat data...</p> : (
          <>
            <div className="overflow-x-auto">
              <AppTable headers={["Nama / Badge", "No KP", "ID Card / KTP", "Tipe SIM", "Permit Expired", ""]}>
                {paged.slice.map((r) => {
                  return (
                    <AppTableRow key={r.id}>
                      {/* Nama + badge */}
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#1C1D22]">{r.holder?.nama || "-"}</p>
                        <p className="text-xs text-gray-400">{r.holder?.no_badge || ""}</p>
                      </td>
                      {/* No KP */}
                      <td className="px-5 py-3 text-sm text-gray-700 font-medium">{r.kode_item || "-"}</td>
                      {/* ID Card / KTP */}
                      <td className="px-5 py-3 text-sm text-gray-600">{r.id_card || "-"}</td>
                      {/* Tipe SIM */}
                      <td className="px-5 py-3">
                        {r.tipe_sim
                          ? <span className="text-xs font-semibold bg-[#e8eff8] text-[#1d4f91] px-2 py-0.5 rounded-full">{r.tipe_sim}</span>
                          : <span className="text-gray-400 text-xs">-</span>}
                      </td>
                      {/* Permit expired */}
                      <td className="px-5 py-3">
                        <div className="text-gray-600 text-sm">{fmtDate(r.tanggal_expired)}</div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.permit.styles}`}>{r.permit.label}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(r)} aria-label="Edit"
                            className="text-[#1d4f91] hover:bg-[#e8eff8] p-1.5 rounded-md"><LuPencil size={16} /></button>
                          <button onClick={() => setDeleteItem(r)} aria-label="Hapus"
                            className="text-[#CC5F5F] hover:bg-red-50 p-1.5 rounded-md"><LuTrash2 size={16} /></button>
                        </div>
                      </td>
                    </AppTableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada data KP</td></tr>
                )}
              </AppTable>
            </div>
            <Pagination p={paged} />
          </>
        )}
      </AppCard>

      {/* ── Modal tambah / edit ── */}
      <AppModal show={showModal} onClose={() => setShowModal(false)}>
        <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit KP" : "Catat KP"}</h3>
        {error && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-md p-2.5 mb-3">{error}</p>}

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {/* Seksi: Data Pemegang */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Data Pemegang</p>
          <Field label="Nama pemegang *">
            <AppSelect className="w-full" value={form.manpower_id}
              onChange={(e) => setForm({ ...form, manpower_id: e.target.value })}>
              <option value="">Pilih manpower…</option>
              {manpower.map((m) => <option key={m.id} value={m.id}>{m.nama} ({m.no_badge})</option>)}
            </AppSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="No KP *">
              <InputField name="kode_item" placeholder="mis. MPN24001"
                value={form.kode_item} onChange={(e) => setForm({ ...form, kode_item: e.target.value })} />
            </Field>
            <Field label="ID Card / KTP">
              <InputField name="id_card" placeholder="Nomor KTP"
                value={form.id_card} onChange={(e) => setForm({ ...form, id_card: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipe SIM">
              <AppSelect className="w-full" value={form.tipe_sim}
                onChange={(e) => setForm({ ...form, tipe_sim: e.target.value })}>
                <option value="">Pilih…</option>
                {TIPE_SIM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </AppSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tgl pengambilan">
              <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
                value={form.tanggal_ambil} onChange={(e) => setForm({ ...form, tanggal_ambil: e.target.value })} />
            </Field>
            <Field label="Permit expired">
              <input type="date" className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91]"
                value={form.tanggal_expired} onChange={(e) => setForm({ ...form, tanggal_expired: e.target.value })} />
            </Field>
          </div>

          {/* Seksi: Status KP sudah ada di atas */}
        </div>

        <FormActions onCancel={() => setShowModal(false)} onSubmit={handleSubmit} />
      </AppModal>

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteItem && (
        <AppModal show onClose={() => setDeleteItem(null)}>
          <h3 className="text-lg font-semibold mb-2">Hapus Kartu Pengemudi</h3>
          <p className="text-sm text-gray-500 mb-4">
            Apakah Anda yakin ingin menghapus{" "}
            <span className="font-semibold text-[#1C1D22]">{deleteItem.kode_item || "KP ini"}</span>?
            Tindakan ini tidak dapat dibatalkan.
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
