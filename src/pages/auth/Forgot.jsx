import { useState } from "react";
import { Link } from "react-router-dom";
import { LuCircleCheck } from "react-icons/lu";

export default function Forgot() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) setSent(true);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#1C1D22] mb-1">
        Lupa Password?
      </h2>
      <p className="text-sm text-gray-400 mb-7">
        Masukkan email untuk menerima link reset password
      </p>

      {/* Success state */}
      {sent ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-[#e8eff8] rounded-full flex items-center justify-center mx-auto mb-4">
            <LuCircleCheck className="text-[#1d4f91] text-3xl" />
          </div>
          <p className="font-semibold text-[#1C1D22] mb-1">
            Email Terkirim!
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Cek inbox <span className="text-[#1d4f91] font-medium">{email}</span> untuk link reset password.
          </p>
          <button onClick={() => setSent(false)}
            className="text-sm text-[#1d4f91] hover:underline">
            Kirim ulang
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1C1D22] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[#1d4f91] focus:ring-2 focus:ring-[#e8eff8] transition"
            />
          </div>
          <button type="submit"
            className="w-full bg-[#1d4f91] hover:bg-[#17407a] text-white font-semibold py-2.5 rounded-md transition text-sm">
            Kirim Link Reset
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Ingat password?{" "}
        <Link to="/login" className="text-[#1d4f91] font-semibold hover:underline">
          Kembali Login
        </Link>
      </p>
    </div>
  );
}