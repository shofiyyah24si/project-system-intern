import { useState, useRef } from "react";
import { HiOutlineHome } from "react-icons/hi2";
import {
  LuUser, LuMail, LuLock, LuCamera, LuCircleCheck,
  LuTriangleAlert, LuEye, LuEyeOff,
} from "react-icons/lu";
import { userAPI }    from "../../services/userAPI";
import { storageAPI } from "../../services/storageAPI"; // upload foto profil

/**
 * AdminProfile.jsx — Pengaturan Profil Admin
 *
 * Fitur:
 * - Edit nama tampilan
 * - Upload foto profil ke Supabase Storage
 * - Ganti password (konfirmasi password lama dulu)
 *
 * Setelah update berhasil, data di localStorage ikut diperbarui
 * agar Header.jsx langsung menampilkan perubahan tanpa perlu reload.
 */

// ── Input field sederhana ─────────────────────────────────────
function Field({ label, icon: Icon, type = "text", value, onChange,
                 placeholder, hint, rightSlot }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border border-gray-200 rounded-md py-2.5 text-sm outline-none
            focus:border-[#1d4f91] transition
            ${Icon ? "pl-9" : "pl-3"} ${rightSlot ? "pr-10" : "pr-3"}`}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {hint && (
        <p className="text-[11px] text-gray-400 mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Alert komponen ────────────────────────────────────────────
function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = type === "success"
    ? "bg-green-50 border-green-200 text-green-700"
    : "bg-red-50 border-red-200 text-red-600";
  const Icon = type === "success" ? LuCircleCheck : LuTriangleAlert;
  return (
    <div className={`flex items-center gap-2 border rounded-md px-4 py-3 text-sm ${styles}`}>
      <Icon className="flex-shrink-0" /> {msg}
    </div>
  );
}

export default function AdminProfile() {
  const raw  = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : {};

  // ── State form nama ───────────────────────────────────────
  const [nama, setNama]           = useState(user.nama || user.name || "");
  const [savingNama, setSavingNama] = useState(false);
  const [msgNama, setMsgNama]     = useState({ type: "", text: "" });

  // ── State foto ────────────────────────────────────────────
  const [fotoPreview, setFotoPreview] = useState(user.foto || user.avatar || "");
  const [fotoFile, setFotoFile]       = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [msgFoto, setMsgFoto]         = useState({ type: "", text: "" });
  const fileRef = useRef(null);

  // ── State password ────────────────────────────────────────
  const [pwLama, setPwLama]         = useState("");
  const [pwBaru, setPwBaru]         = useState("");
  const [pwKonfirm, setPwKonfirm]   = useState("");
  const [showPw, setShowPw]         = useState({ lama: false, baru: false, konfirm: false });
  const [savingPw, setSavingPw]     = useState(false);
  const [msgPw, setMsgPw]           = useState({ type: "", text: "" });

  // Helper: sync localStorage + paksa Header re-render
  const syncLocalStorage = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem("user", JSON.stringify(updated));
  };

  // ── SIMPAN NAMA ───────────────────────────────────────────
  const handleSaveNama = async () => {
    setMsgNama({ type: "", text: "" });
    if (!nama.trim()) {
      setMsgNama({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }
    try {
      setSavingNama(true);
      await userAPI.updateUser(user.id, { nama: nama.trim() });
      syncLocalStorage({ nama: nama.trim() });
      setMsgNama({ type: "success", text: "Nama berhasil diperbarui." });
    } catch (e) {
      setMsgNama({ type: "error", text: "Gagal menyimpan nama." });
    } finally {
      setSavingNama(false);
    }
  };

  // ── PILIH FOTO (preview saja, belum upload) ──────────────
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setMsgFoto({ type: "", text: "" });
  };

  // ── SIMPAN NAMA + FOTO SEKALIGUS ──────────────────────────
  const handleSaveNamaFoto = async () => {
    setMsgNama({ type: "", text: "" });
    setMsgFoto({ type: "", text: "" });

    if (!nama.trim()) {
      setMsgNama({ type: "error", text: "Nama tidak boleh kosong." });
      return;
    }

    try {
      setSavingNama(true);

      // ── STEP 1: Simpan nama (selalu jalan) ───────────────
      await userAPI.updateUser(user.id, { nama: nama.trim() });
      syncLocalStorage({ nama: nama.trim() });

      // ── STEP 2: Upload + simpan foto (jika ada file baru) ─
      if (fotoFile) {
        setUploadingFoto(true);
        try {
          const url = await storageAPI.uploadFile(fotoFile);

          // Coba simpan URL foto ke kolom 'foto' di tabel users
          // Kolom ini mungkin bernama 'foto', 'avatar', atau 'photo_url'
          // Coba semua kemungkinan nama kolom
          let fotoSaved = false;
          for (const kolom of ["foto", "avatar", "photo_url", "image"]) {
            try {
              await userAPI.updateUser(user.id, { [kolom]: url });
              syncLocalStorage({ foto: url, [kolom]: url });
              fotoSaved = true;
              break;
            } catch {
              // Coba kolom berikutnya
            }
          }

          if (!fotoSaved) {
            // Kolom belum ada di DB — simpan hanya di localStorage untuk tampilan
            syncLocalStorage({ foto: url });
          }

          setFotoFile(null);
          setFotoPreview(url);
        } catch (fotoErr) {
          console.error("Upload foto gagal:", fotoErr);
          // Jangan gagalkan keseluruhan — nama sudah tersimpan
          setMsgFoto({ type: "error", text: "Nama tersimpan, tapi foto gagal diupload. Jalankan SQL migration terlebih dahulu." });
          setMsgNama({ type: "success", text: "Nama berhasil diperbarui." });
          return;
        } finally {
          setUploadingFoto(false);
        }
      }

      setMsgNama({ type: "success", text: "Profil berhasil diperbarui." });

    } catch (e) {
      console.error("Gagal simpan profil:", e);
      const detail = e.response?.data?.message || e.message || "";
      setMsgNama({ type: "error", text: `Gagal menyimpan profil: ${detail || "Coba lagi."}` });
    } finally {
      setSavingNama(false);
      setUploadingFoto(false);
    }
  };

  // ── GANTI PASSWORD ────────────────────────────────────────
  const handleSavePassword = async () => {
    setMsgPw({ type: "", text: "" });

    // Validasi
    if (!pwLama)                        { setMsgPw({ type: "error", text: "Masukkan password lama." }); return; }
    if (pwLama !== user.password)       { setMsgPw({ type: "error", text: "Password lama tidak sesuai." }); return; }
    if (pwBaru.length < 6)              { setMsgPw({ type: "error", text: "Password baru minimal 6 karakter." }); return; }
    if (pwBaru !== pwKonfirm)           { setMsgPw({ type: "error", text: "Konfirmasi password tidak cocok." }); return; }
    if (pwBaru === pwLama)              { setMsgPw({ type: "error", text: "Password baru tidak boleh sama dengan password lama." }); return; }

    try {
      setSavingPw(true);
      await userAPI.updateUser(user.id, { password: pwBaru });
      syncLocalStorage({ password: pwBaru });
      setPwLama(""); setPwBaru(""); setPwKonfirm("");
      setMsgPw({ type: "success", text: "Password berhasil diperbarui." });
    } catch (e) {
      setMsgPw({ type: "error", text: "Gagal menyimpan password." });
    } finally {
      setSavingPw(false);
    }
  };

  const inisial = (user.nama || "A").charAt(0).toUpperCase();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1C1D22]">
          Pengaturan Profil
        </h1>
        <div className="flex items-center gap-1.5 mt-1 text-sm">
          <HiOutlineHome className="text-base text-gray-400" />
          <span className="text-gray-400">/</span>
          <span className="text-[#1d4f91] font-medium">Profil</span>
        </div>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* ── SECTION 1: Foto & Nama ─────────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-sm font-bold text-[#1C1D22] flex items-center gap-2">
            <LuUser className="text-[#1d4f91]" /> Informasi Akun
          </h2>

          {/* Foto profil */}
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 bg-[#e8eff8] flex items-center justify-center">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="foto profil"
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <span className="text-2xl font-bold text-[#1d4f91]">
                    {inisial}
                  </span>
                )}
              </div>
              {/* Tombol kamera kecil */}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1d4f91] hover:bg-[#17407a] text-white rounded-full flex items-center justify-center shadow-sm transition">
                <LuCamera className="text-xs" />
              </button>
              <input ref={fileRef} type="file" accept="image/*"
                onChange={handleFotoChange} className="hidden" />
            </div>

            {/* Info + preview nama file */}
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-[#1C1D22]">
                {user.nama || "Admin"}
              </p>
              <p className="text-xs text-gray-400">
                {user.email}
              </p>
              {fotoFile && (
                <p className="text-xs text-[#1d4f91] flex items-center gap-1">
                  📎 {fotoFile.name} — akan diupload saat klik Simpan
                </p>
              )}
              <p className="text-[11px] text-gray-400">
                Klik ikon kamera untuk ganti foto. Format: JPG, PNG (maks. 5MB)
              </p>
            </div>
          </div>

          <Alert type={msgFoto.type} msg={msgFoto.text} />

          {/* Form nama */}
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <Field
              label="Nama Tampilan"
              icon={LuUser}
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama admin"
              hint="Nama ini ditampilkan di header dan sidebar."
            />
            <Field
              label="Email"
              icon={LuMail}
              value={user.email || ""}
              placeholder="—"
              hint="Email tidak bisa diubah dari sini."
            />
            <Alert type={msgNama.type} msg={msgNama.text} />
            <button
              onClick={handleSaveNamaFoto}
              disabled={savingNama || uploadingFoto}
              className="w-full py-2.5 bg-[#1d4f91] hover:bg-[#17407a] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition">
              {uploadingFoto ? "Mengupload foto..." : savingNama ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </div>
        </div>

        {/* ── SECTION 2: Ganti Password ──────────────────── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#1C1D22] flex items-center gap-2">
            <LuLock className="text-[#1d4f91]" /> Ganti Password
          </h2>

          {/* Password lama */}
          <Field
            label="Password Lama"
            icon={LuLock}
            type={showPw.lama ? "text" : "password"}
            value={pwLama}
            onChange={e => setPwLama(e.target.value)}
            placeholder="Masukkan password saat ini"
            rightSlot={
              <button type="button" onClick={() => setShowPw(p => ({ ...p, lama: !p.lama }))}
                className="text-gray-400 hover:text-gray-600 transition">
                {showPw.lama ? <LuEyeOff className="text-sm" /> : <LuEye className="text-sm" />}
              </button>
            }
          />

          {/* Password baru */}
          <Field
            label="Password Baru"
            icon={LuLock}
            type={showPw.baru ? "text" : "password"}
            value={pwBaru}
            onChange={e => setPwBaru(e.target.value)}
            placeholder="Min. 6 karakter"
            hint="Gunakan kombinasi huruf, angka, dan simbol."
            rightSlot={
              <button type="button" onClick={() => setShowPw(p => ({ ...p, baru: !p.baru }))}
                className="text-gray-400 hover:text-gray-600 transition">
                {showPw.baru ? <LuEyeOff className="text-sm" /> : <LuEye className="text-sm" />}
              </button>
            }
          />

          {/* Konfirmasi password baru */}
          <Field
            label="Konfirmasi Password Baru"
            icon={LuLock}
            type={showPw.konfirm ? "text" : "password"}
            value={pwKonfirm}
            onChange={e => setPwKonfirm(e.target.value)}
            placeholder="Ulangi password baru"
            rightSlot={
              <button type="button" onClick={() => setShowPw(p => ({ ...p, konfirm: !p.konfirm }))}
                className="text-gray-400 hover:text-gray-600 transition">
                {showPw.konfirm ? <LuEyeOff className="text-sm" /> : <LuEye className="text-sm" />}
              </button>
            }
          />

          <Alert type={msgPw.type} msg={msgPw.text} />

          <button
            onClick={handleSavePassword}
            disabled={savingPw}
            className="w-full py-2.5 bg-[#1d4f91] hover:bg-[#17407a] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition">
            {savingPw ? "Menyimpan..." : "Ganti Password"}
          </button>
        </div>

      </div>
    </div>
  );
}
