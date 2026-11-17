import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import { ImSpinner2 } from "react-icons/im";
import { userAPI } from "../../services/userAPI";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [dataForm, setDataForm] = useState({
    nama: "", email: "", password: "", konfirmasi: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDataForm({ ...dataForm, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validasi
    if (!dataForm.nama || !dataForm.email || !dataForm.password || !dataForm.konfirmasi) {
      setError("Semua field wajib diisi");
      return;
    }
    if (dataForm.password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (dataForm.password !== dataForm.konfirmasi) {
      setError("Password dan konfirmasi password tidak sama");
      return;
    }

    try {
      setLoading(true);

      // Cek duplikat email
      const emailExists = await userAPI.checkEmailExists(dataForm.email);
      if (emailExists) {
        setError("Email sudah terdaftar, gunakan email lain");
        return;
      }

      // Simpan ke Supabase
      await userAPI.registerUser({
        nama: dataForm.nama,
        email: dataForm.email,
        password: dataForm.password,
      });

      setSuccess("Pendaftaran berhasil! Silakan login.");
      setDataForm({ nama: "", email: "", password: "", konfirmasi: "" });

      // Redirect ke login setelah 2 detik
      setTimeout(() => navigate("/login"), 2000);

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
        Daftar Akun
      </h2>
      <p className="text-sm text-gray-400 mb-7">
        Buat akun baru untuk mengakses sistem
      </p>

      {/* Error */}
      {error && (
        <div className="bg-red-50 mb-5 p-3 text-sm text-[#CC5F5F] rounded-md flex items-center gap-2 border border-red-100">
          <LuCircleAlert className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-green-50 mb-5 p-3 text-sm text-green-700 rounded-md flex items-center gap-2 border border-green-200">
          <LuCircleCheck className="flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#e8eff8] mb-5 p-3 text-sm text-[#1d4f91] rounded-md flex items-center gap-2">
          <ImSpinner2 className="animate-spin flex-shrink-0" />
          Mendaftarkan akun...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama */}
        <div>
          <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
            Nama Lengkap
          </label>
          <input type="text" name="nama"
            value={dataForm.nama} onChange={handleChange} disabled={loading}
            placeholder="Nama lengkap"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60" />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
            Email
          </label>
          <input type="email" name="email"
            value={dataForm.email} onChange={handleChange} disabled={loading}
            placeholder="email@contoh.com"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60" />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={dataForm.password} onChange={handleChange} disabled={loading}
              placeholder="Minimal 6 karakter"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition pr-24 disabled:opacity-60" />
            <button type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
              {showPass ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </div>

        {/* Konfirmasi Password */}
        <div>
          <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
            Konfirmasi Password
          </label>
          <input
            type={showPass ? "text" : "password"}
            name="konfirmasi"
            value={dataForm.konfirmasi} onChange={handleChange} disabled={loading}
            placeholder="Ulangi password"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition disabled:opacity-60" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-[#1d4f91] hover:bg-[#17407a] disabled:opacity-60 text-white font-semibold py-2.5 rounded-md transition text-sm mt-2">
          {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Sudah punya akun?{" "}
        <Link to="/login" className="text-[#1d4f91] font-semibold hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
