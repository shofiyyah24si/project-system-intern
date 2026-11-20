import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuPlus, LuTrash2, LuChevronRight, LuPencil,
  LuCalendar, LuMapPin, LuCircleAlert, LuX,
} from "react-icons/lu";
import { meetingAPI } from "../../services/meetingAPI";
import { useRole } from "../../lib/useRole";
import PageHeader from "../../components/PageHeader";
import AppCard from "../../components/common/AppCard";
import AppButton from "../../components/common/AppButton";
import AppModal from "../../components/common/AppModal";
import FormActions from "../../components/common/FormActions";

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  tanggal_meeting: todayStr(),
  lokasi: "Batch Plant",
  agendas: [""],   // array agenda items
});

// ── Komponen form agenda (bisa tambah/hapus baris) ──────────
function AgendaInput({ agendas, onChange }) {
  const update = (i, val) => {
    const next = [...agendas];
    next[i] = val;
    onChange(next);
  };
  const add = () => onChange([...agendas, ""]);
  const remove = (i) => {
    if (agendas.length <= 1) return;
    onChange(agendas.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-500 block">Agenda Meeting</label>
      {agendas.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
          <input
            type="text"
            value={a}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Agenda ${i + 1}`}
            className="flex-1 border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={agendas.length <= 1}
            className="text-gray-300 hover:text-[#CC5F5F] transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <LuX size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs text-[#1d4f91] hover:underline flex items-center gap-1 pl-7"
      >
        <LuPlus size={12} /> Tambah agenda
      </button>
    </div>
  );
}

// ── Modal konfirmasi hapus ──────────────────────────────────
function DeleteConfirmModal({ session, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  if (!session) return null;
  const tgl = new Date(session.tanggal_meeting).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <AppModal show onClose={onClose}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <LuCircleAlert className="text-[#CC5F5F] text-lg" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#1C1D22]">Hapus Sesi Meeting</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sesi <span className="font-medium text-[#1C1D22]">{tgl}</span> beserta seluruh data
            kehadirannya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <AppButton type="ghost" onClick={onClose} disabled={deleting}>Batal</AppButton>
        <AppButton type="danger" disabled={deleting} onClick={async () => {
          setDeleting(true);
          await onConfirm();
          setDeleting(false);
        }}>
          {deleting ? "Menghapus..." : "Hapus"}
        </AppButton>
      </div>
    </AppModal>
  );
}

// ── Helper: agenda string → array ──────────────────────────
function parseAgendas(keterangan) {
  if (!keterangan) return [""];
  const str = keterangan.trim();
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        const items = parsed.map((s) => String(s).trim()).filter(Boolean);
        return items.length ? items : [""];
      }
    } catch {
      const items = str
        .replace(/^\[|\]$/g, "")
        .split(/",\s*"/)
        .map((s) => s.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
      return items.length ? items : [""];
    }
  }
  const lines = str.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : [""];
}

function agendasToString(agendas) {
  const filled = agendas.map((a) => a.trim()).filter(Boolean);
  return JSON.stringify(filled.length ? filled : []);
}

function agendasDisplay(keterangan) {
  if (!keterangan) return [];
  const str = keterangan.trim();
  // JSON array: dimulai dengan "["
  if (str.startsWith("[")) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // JSON rusak — strip bracket dan tanda kutip manual
      return str
        .replace(/^\[|\]$/g, "")
        .split(/",\s*"/)
        .map((s) => s.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    }
  }
  // plain text — split per baris
  return str.split("\n").map((l) => l.trim()).filter(Boolean);
}

// ── Halaman utama ───────────────────────────────────────────
export default function MeetingSessions() {
  const navigate = useNavigate();
  const { isViewer } = useRole();
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);

  // modal buat/edit
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  // modal hapus
  const [deleteItem, setDeleteItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setSessions(await meetingAPI.fetchSessions()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setError("");
    setShowModal(true);
  };

  const openEdit = (e, s) => {
    e.stopPropagation();
    setForm({
      tanggal_meeting: s.tanggal_meeting,
      lokasi: s.lokasi || "",
      agendas: parseAgendas(s.keterangan),
    });
    setEditingId(s.id);
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.tanggal_meeting) { setError("Tanggal wajib diisi"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        tanggal_meeting: form.tanggal_meeting,
        lokasi: form.lokasi.trim() || null,
        keterangan: agendasToString(form.agendas),
      };
      if (editingId) {
        await meetingAPI.updateSession(editingId, payload);
        setShowModal(false);
        load();
      } else {
        const session = await meetingAPI.createSession(payload);
        setShowModal(false);
        navigate(`/meetings/${session.id}`);
      }
    } catch {
      setError(editingId ? "Gagal menyimpan perubahan." : "Gagal membuat sesi. Pastikan sudah ada data manpower.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await meetingAPI.deleteSession(deleteItem.id);
    setDeleteItem(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Kehadiran Weekly Meeting" breadcrumb="Kehadiran Meeting">
        {!isViewer && (
          <AppButton type="primary" onClick={openCreate}>
            <LuPlus className="inline mr-1" /> Buat Sesi Baru
          </AppButton>
        )}
      </PageHeader>

      <div className="mx-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-sm text-gray-400">Memuat sesi...</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-sm text-gray-400 col-span-3">
            Belum ada sesi meeting. Buat sesi baru untuk mulai mencatat kehadiran.
          </p>
        )}

        {sessions.map((s) => {
          const agendas = agendasDisplay(s.keterangan);
          return (
            <AppCard
              key={s.id}
              className="p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/meetings/${s.id}`)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  {/* Tanggal */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <LuCalendar size={13} className="text-[#1d4f91] flex-shrink-0" />
                    <p className="font-semibold text-[#1C1D22] text-sm">
                      {new Date(s.tanggal_meeting).toLocaleDateString("id-ID", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                  {/* Lokasi */}
                  {s.lokasi && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <LuMapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-400">{s.lokasi}</p>
                    </div>
                  )}
                  {/* Agenda */}
                  {agendas.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {agendas.map((a, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <span className="text-[10px] font-bold bg-[#e8eff8] text-[#1d4f91] rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-xs text-gray-600 leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aksi edit/hapus — hanya admin */}
                {!isViewer && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={(e) => openEdit(e, s)} className="text-[#1d4f91] hover:bg-[#e8eff8] p-1.5 rounded-lg" title="Edit sesi">
                      <LuPencil size={15} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteItem(s); }} className="text-[#CC5F5F] hover:bg-red-50 p-1.5 rounded-lg" title="Hapus sesi">
                      <LuTrash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-1 mt-3 text-xs text-[#1d4f91] font-medium border-t border-gray-50 pt-2.5">
                Lihat & tandai kehadiran <LuChevronRight size={14} />
              </div>
            </AppCard>
          );
        })}
      </div>

      {/* ── Modal buat / edit sesi ── */}
      <AppModal show={showModal} onClose={() => setShowModal(false)}>
        <h3 className="text-lg font-semibold mb-1">
          {editingId ? "Edit Sesi Meeting" : "Buat Sesi Meeting Baru"}
        </h3>
        {!editingId && (
          <p className="text-xs text-gray-400 mb-3">
            Sistem otomatis menyiapkan daftar semua manpower aktif — kamu tinggal tandai siapa yang hadir.
          </p>
        )}
        {error && <p className="text-sm text-[#CC5F5F] bg-red-50 rounded-lg p-2.5 mb-3">{error}</p>}

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {/* Tanggal */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Tanggal Meeting *</label>
            <input
              type="date"
              value={form.tanggal_meeting}
              onChange={(e) => setForm({ ...form, tanggal_meeting: e.target.value })}
              className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
            />
          </div>

          {/* Lokasi */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Lokasi / Venue</label>
            <input
              type="text"
              value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              placeholder="mis. Batch Plant"
              className="w-full border border-gray-200 rounded-md p-2.5 text-sm outline-none focus:border-[#1d4f91] transition"
            />
          </div>

          {/* Agenda — bisa banyak */}
          <AgendaInput
            agendas={form.agendas}
            onChange={(agendas) => setForm({ ...form, agendas })}
          />
        </div>

        <FormActions
          onCancel={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitLabel={saving ? "Menyimpan..." : editingId ? "Simpan" : "Buat Sesi"}
          disabled={saving}
        />
      </AppModal>

      {/* ── Modal hapus ── */}
      <DeleteConfirmModal
        session={deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
