import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import { ImSpinner2 } from "react-icons/im";
import { userAPI } from "../../services/userAPI";

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [dataForm, setDataForm] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDataForm({ ...dataForm, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!dataForm.email || !dataForm.password) {
      setError("Email dan password wajib diisi");
      return;
    }

    try {
      setLoading(true);
      const users = await userAPI.loginUser(dataForm.email, dataForm.password);

      if (!users || users.length === 0) {
        setError("Email atau password salah");
        return;
      }

      const user = users[0];
      // simpan sesi ke localStorage — dibaca di semua halaman untuk cek login
      localStorage.setItem("user", JSON.stringify(user));
      // redirect langsung ke /dashboard sambil bawa state login berhasil
      navigate("/dashboard", { state: { loginSuccess: true, nama: user?.nama || user?.name || "Admin" } });

    } catch (err) {
      setError("Terjadi kesalahan. Coba lagi nanti.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1C1D22] mb-1">
        Masuk
      </h2>
      <p className="text-sm text-gray-400 mb-7">
        Silakan login untuk melanjutkan
      </p>

      {error && (
        <div className="bg-red-50 mb-5 p-3 text-sm text-[#CC5F5F] rounded-md flex items-center gap-2 border border-red-100">
          <LuCircleAlert className="flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-[#e8eff8] mb-5 p-3 text-sm text-[#1d4f91] rounded-md flex items-center gap-2">
          <ImSpinner2 className="animate-spin flex-shrink-0" />
          Memverifikasi akun...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
            Email
          </label>
          <input
            type="email" name="email"
            value={dataForm.email}
            onChange={handleChange}
            disabled={loading}
            placeholder="Masukkan email Anda"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-medium text-[#1C1D22]">
              Password
            </label>
            <Link to="/forgot"
              className="text-xs text-[#1d4f91] hover:underline">
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            {/* type berubah sesuai toggle showPass */}
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={dataForm.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition pr-24 disabled:opacity-60"
            />
            <button type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
              {showPass ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </div>

        {/* disabled saat loading biar tidak bisa double submit */}
        <button type="submit" disabled={loading}
          className="w-full bg-[#1d4f91] hover:bg-[#17407a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-md transition text-sm mt-2">
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Belum punya akun?{" "}
        <Link to="/register"
          className="text-[#1d4f91] font-semibold hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
