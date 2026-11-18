import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LuCircleAlert, LuMail, LuLock, LuEye, LuEyeOff } from "react-icons/lu";
import { ImSpinner2 } from "react-icons/im";
import { userAPI } from "../../services/userAPI";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]         = useState({ email: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("Email dan password wajib diisi"); return; }

    try {
      setLoading(true);
      const users = await userAPI.loginUser(form.email, form.password);
      if (!users || users.length === 0) { setError("Email atau password salah"); return; }
      const user = users[0];
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/dashboard", { state: { loginSuccess: true, nama: user?.nama || "User" } });
    } catch {
      setError("Terjadi kesalahan. Coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-[#1C1D22] mb-1">Selamat Datang</h2>
        <p className="text-sm text-gray-400">Masuk ke akun HSE System Anda</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 mb-5 px-4 py-3 text-sm text-[#CC5F5F] rounded-xl flex items-center gap-2.5 border border-red-100">
          <LuCircleAlert size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Email
          </label>
          <div className="relative">
            <LuMail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
              placeholder="email@contoh.com"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1d4f91] focus:bg-white focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
          </div>
          <div className="relative">
            <LuLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#1d4f91] focus:bg-white focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              {showPass ? <LuEyeOff size={16} /> : <LuEye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1d4f91] hover:bg-[#17407a] active:scale-[0.98] disabled:opacity-60
            text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <><ImSpinner2 className="animate-spin" size={16} /> Memverifikasi...</>
          ) : "Masuk"}
        </button>
      </form>

      {/* Register link */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Belum punya akun?{" "}
          <Link to="/register" className="text-[#1d4f91] font-semibold hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
