import { useState, useEffect } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

const SIZE_OPTIONS = [10, 25, 50, 100];

export function usePaged(rows, defaultSize = 10) {
  const [page, setPage]     = useState(1);
  const [size, setSize]     = useState(defaultSize);
  const pages = Math.max(1, Math.ceil(rows.length / size));

  // reset ke halaman 1 kalau filter berubah atau size berubah
  useEffect(() => { setPage(1); }, [rows.length, size]);
  useEffect(() => { if (page > pages) setPage(pages); }, [pages, page]);

  const changeSize = (newSize) => { setSize(newSize); setPage(1); };

  return {
    page, setPage,
    pages,
    size, changeSize,
    total: rows.length,
    slice: rows.slice((page - 1) * size, page * size),
  };
}

export default function Pagination({ p }) {
  if (p.total === 0) return null;
  const from = (p.page - 1) * p.size + 1;
  const to   = Math.min(p.page * p.size, p.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
      {/* Kiri: pilih jumlah per halaman */}
      <div className="flex items-center gap-1.5">
        <span>Tampilkan</span>
        <div className="flex items-center gap-0.5">
          {[10, 25, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => p.changeSize(n)}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                p.size === n
                  ? "bg-[#1d4f91] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-[#e8eff8] hover:text-[#1d4f91]"
              }`}>
              {n}
            </button>
          ))}
        </div>
        <span>— {from}–{to} dari {p.total} data</span>
      </div>

      {/* Kanan: navigasi halaman */}
      <div className="flex items-center gap-1">
        <button
          disabled={p.page === 1}
          onClick={() => p.setPage(1)}
          className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs">
          «
        </button>
        <button
          disabled={p.page === 1}
          onClick={() => p.setPage(p.page - 1)}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
          <LuChevronLeft size={14} />
        </button>

        {/* nomor halaman: tampilkan maks 5 di sekitar halaman aktif */}
        {Array.from({ length: p.pages }, (_, i) => i + 1)
          .filter((n) => n === 1 || n === p.pages || Math.abs(n - p.page) <= 1)
          .reduce((acc, n, idx, arr) => {
            if (idx > 0 && n - arr[idx - 1] > 1) acc.push("...");
            acc.push(n);
            return acc;
          }, [])
          .map((n, i) =>
            n === "..." ? (
              <span key={`dot-${i}`} className="px-1 text-gray-400">…</span>
            ) : (
              <button
                key={n}
                onClick={() => p.setPage(n)}
                className={`min-w-[28px] px-1.5 py-1 rounded text-xs font-medium transition ${
                  p.page === n
                    ? "bg-[#1d4f91] text-white"
                    : "hover:bg-gray-100 text-gray-600"
                }`}>
                {n}
              </button>
            )
          )}

        <button
          disabled={p.page === p.pages}
          onClick={() => p.setPage(p.page + 1)}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
          <LuChevronRight size={14} />
        </button>
        <button
          disabled={p.page === p.pages}
          onClick={() => p.setPage(p.pages)}
          className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs">
          »
        </button>
      </div>
    </div>
  );
}
