import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LuCircleAlert, LuCircleCheck, LuMail, LuLock, LuUser, LuEye, LuEyeOff } from "react-icons/lu";
import { ImSpinner2 } from "react-icons/im";
import { userAPI } from "../../services/userAPI";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]         = useState({ nama: "", email: "", password: "", konfirmasi: "" });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.nama || !form.email || !form.password || !form.konfirmasi) {
      setError("Semua field wajib diisi"); return;
    }
    if (form.password.length < 6) { setError("Password minimal 6 karakter"); return; }
    if (form.password !== form.konfirmasi) { setError("Password dan konfirmasi tidak sama"); return; }

    try {
      setLoading(true);
      const exists = await userAPI.checkEmailExists(form.email);
      if (exists) { setError("Email sudah terdaftar, gunakan email lain"); return; }
      await userAPI.registerUser({ nama: form.nama, email: form.email, password: form.password, role: "viewer" });
      setSuccess("Pendaftaran berhasil! Mengalihkan ke halaman login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1d4f91] focus:bg-white focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1C1D22] mb-1">Buat Akun</h2>
        <p className="text-sm text-gray-400">Akun baru akan terdaftar sebagai <span className="font-medium text-[#1d4f91]">Viewer</span> — hanya bisa melihat data</p>
      </div>

      {/* Alert */}
      {error && (
        <div className="bg-red-50 mb-4 px-4 py-3 text-sm text-[#CC5F5F] rounded-xl flex items-center gap-2.5 border border-red-100">
          <LuCircleAlert size={15} className="flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 mb-4 px-4 py-3 text-sm text-green-700 rounded-xl flex items-center gap-2.5 border border-green-200">
          <LuCircleCheck size={15} className="flex-shrink-0" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nama Lengkap</label>
          <div className="relative">
            <LuUser size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={form.nama} onChange={set("nama")} disabled={loading}
              placeholder="Nama lengkap Anda"
              className={`${inputCls} pl-10 pr-4`}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</label>
          <div className="relative">
            <LuMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email" value={form.email} onChange={set("email")} disabled={loading}
              placeholder="email@contoh.com"
              className={`${inputCls} pl-10 pr-4`}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Password</label>
          <div className="relative">
            <LuLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? "text" : "password"} value={form.password} onChange={set("password")} disabled={loading}
              placeholder="Minimal 6 karakter"
              className={`${inputCls} pl-10 pr-11`}
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPass ? <LuEyeOff size={16} /> : <LuEye size={16} />}
            </button>
          </div>
        </div>

        {/* Konfirmasi */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Konfirmasi Password</label>
          <div className="relative">
            <LuLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? "text" : "password"} value={form.konfirmasi} onChange={set("konfirmasi")} disabled={loading}
              placeholder="Ulangi password"
              className={`${inputCls} pl-10 pr-4`}
            />
          </div>
          {/* Indikator kesesuaian password */}
          {form.konfirmasi && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${form.password === form.konfirmasi ? "text-green-600" : "text-[#CC5F5F]"}`}>
              {form.password === form.konfirmasi
                ? <><LuCircleCheck size={12} /> Password cocok</>
                : <><LuCircleAlert size={12} /> Password tidak cocok</>
              }
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          className="w-full bg-[#1d4f91] hover:bg-[#17407a] active:scale-[0.98] disabled:opacity-60
            text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-1"
        >
          {loading
            ? <><ImSpinner2 className="animate-spin" size={16} /> Mendaftarkan...</>
            : "Daftar Sekarang"
          }
        </button>
      </form>

      {/* Login link */}
      <div className="mt-5 pt-5 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-[#1d4f91] font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
