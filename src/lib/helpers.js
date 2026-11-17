export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const daysUntil = (d) => {
  if (!d) return null;
  const t = new Date(todayISO()).getTime();
  return Math.round((new Date(d).getTime() - t) / 86400000);
};

// ubah angka ini kalau batas "segera kadaluarsa" mau diubah
export const CAL_THRESHOLD_DAYS = 30;

// badge Days Expired untuk PGD — kembalikan { key, label, styles, days }
export const calExpInfo = (nextCal) => {
  const d = daysUntil(nextCal);
  if (d === null) return { key: "none", label: "-", styles: "bg-gray-100 text-gray-500", days: null };
  if (d < 0)  return { key: "overdue", label: `Expired ${-d} hari lalu`, styles: "bg-red-100 text-red-600", days: d };
  if (d === 0) return { key: "overdue", label: "Expired hari ini",        styles: "bg-red-100 text-red-600", days: 0 };
  if (d <= CAL_THRESHOLD_DAYS) return { key: "soon", label: `${d} hari lagi`, styles: "bg-amber-100 text-amber-700", days: d };
  return { key: "ok", label: `${d} hari lagi`, styles: "bg-green-100 text-green-600", days: d };
};

export const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));

// export ke Excel — kolom: [{ key, label, width }], rows: [{ key: value }]
export async function exportXlsx(fileName, sheetName, columns, rows) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 18 }));
  rows.forEach((r) => ws.addRow(r));
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFF8" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

// baca file Excel — baris 1 jadi header (lowercase), sisanya jadi array of object
export async function readXlsx(file) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const heads = [];
  ws.getRow(1).eachCell((c, i) => { heads[i] = String(c.value ?? "").trim().toLowerCase(); });
  const out = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const o = {};
    row.eachCell({ includeEmpty: false }, (c, i) => {
      let v = c.value;
      if (v && typeof v === "object") v = v.text ?? v.result ?? "";
      if (heads[i]) o[heads[i]] = String(v ?? "").trim();
    });
    if (Object.values(o).some(Boolean)) out.push(o);
  });
  return out;
}

// cetak detail PGD ke window baru — buka popup dulu baru print
export function printPGD(item, cals = [], txs = []) {
  const origin = window.location.origin;
  const STATUS_LABEL = { tersedia: "Tersedia", dipegang: "Dipakai", rusak: "Rusak", IN: "IN", OUT: "OUT" };
  const fmt = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const calRows = cals.length
    ? cals.map((c, i) => `<tr>
        <td class="ctr">${i + 1}</td>
        <td>${fmt(c.tanggal_kalibrasi)}</td>
        <td>${fmt(c.tanggal_next_kalibrasi)}</td>
        <td>${c.keterangan || "-"}</td>
        <td>${c.dicatat_oleh || "-"}</td>
        <td>${c.cal_cert_url ? '<span class="badge badge-green">Ada</span>' : '<span class="badge badge-gray">-</span>'}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="empty">Belum ada riwayat kalibrasi</td></tr>`;

  const txRows = txs.length
    ? txs.map((t, i) => {
        const isOut = t.jenis_transaksi === "out";
        return `<tr>
          <td class="ctr">${i + 1}</td>
          <td>${isOut ? '<span class="badge badge-amber">OUT</span>' : '<span class="badge badge-green">IN</span>'}</td>
          <td>${t.manpower?.nama || "-"}${t.manpower?.no_badge ? ` (${t.manpower.no_badge})` : ""}</td>
          <td>${fmt(t.tanggal_transaksi)}</td>
          <td>${t.tanggal_kembali ? fmt(t.tanggal_kembali) : "-"}</td>
          <td>${t.keterangan || "-"}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="6" class="empty">Belum ada riwayat penggunaan</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Detail PGD — ${item.kode_item || ""}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1C1D22; padding: 32px; font-size: 13px; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1d4f91; padding-bottom: 16px; margin-bottom: 24px; }
  .header img { height: 48px; }
  .header .title h1 { font-size: 18px; color: #1d4f91; }
  .header .title p { font-size: 12px; color: #666; margin-top: 2px; }
  .header .meta { margin-left: auto; text-align: right; font-size: 11px; color: #999; }
  h2 { font-size: 14px; color: #1d4f91; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e0e0e0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }
  .info-row { display: flex; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
  .info-label { width: 160px; color: #888; font-size: 12px; flex-shrink: 0; }
  .info-value { font-weight: 600; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
  .status-IN { background: #dcfce7; color: #166534; }
  .status-OUT { background: #fef3c7; color: #92400e; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #e8eff8; color: #1d4f91; font-size: 11px; text-transform: uppercase; padding: 8px 10px; text-align: left; border: 1px solid #d0d8e8; }
  td { padding: 7px 10px; border: 1px solid #e0e0e0; font-size: 12px; }
  .ctr { text-align: center; }
  .empty { text-align: center; color: #999; padding: 16px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-gray  { background: #f3f4f6; color: #6b7280; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 11px; color: #999; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <img src="${origin}/img/logo.png" alt="Logo" onerror="this.style.display='none'" />
    <div class="title">
      <h1>Detail Personal Gas Detector (PGD)</h1>
      <p>PT Wahanakarsa Swandiri — HSE Department</p>
    </div>
    <div class="meta">
      Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}<br/>
      ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
    </div>
  </div>

  <h2>Informasi Alat</h2>
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Nama / No PGD</span><span class="info-value">${item.kode_item || "-"}</span></div>
    <div class="info-row"><span class="info-label">Serial Number</span><span class="info-value">${item.serial_number || "-"}</span></div>
    <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="status-badge status-${item.status}">${STATUS_LABEL[item.status] || item.status}</span></span></div>
    <div class="info-row"><span class="info-label">Pengguna</span><span class="info-value">${item.holder?.nama || "-"}</span></div>
    <div class="info-row"><span class="info-label">Date Out</span><span class="info-value">${fmt(item.date_out || item.tanggal_ambil)}</span></div>
    <div class="info-row"><span class="info-label">Lokasi / Area</span><span class="info-value">${item.lokasi_area || "-"}</span></div>
    <div class="info-row"><span class="info-label">Tgl Kalibrasi</span><span class="info-value">${fmt(item.tgl_kalibrasi)}</span></div>
    <div class="info-row"><span class="info-label">Next Kalibrasi</span><span class="info-value">${fmt(item.next_kalibrasi)}</span></div>
    <div class="info-row"><span class="info-label">Aksesori</span><span class="info-value">${item.aksesori || "-"}</span></div>
    <div class="info-row"><span class="info-label">Project</span><span class="info-value">${item.project || "-"}</span></div>
    <div class="info-row"><span class="info-label">Keterangan</span><span class="info-value">${item.keterangan || "-"}</span></div>
    <div class="info-row"><span class="info-label">Sertifikat</span><span class="info-value">${item.cal_cert_url ? "Ada (lihat di aplikasi)" : "Belum ada"}</span></div>
  </div>

  <h2>Riwayat Kalibrasi</h2>
  <table>
    <thead><tr><th style="width:36px">No</th><th>Tgl Kalibrasi</th><th>Next Kalibrasi</th><th>Keterangan</th><th>Dicatat Oleh</th><th>Sertifikat</th></tr></thead>
    <tbody>${calRows}</tbody>
  </table>

  <h2>Riwayat Penggunaan (In/Out)</h2>
  <table>
    <thead><tr><th style="width:36px">No</th><th style="width:60px">Jenis</th><th>Pengguna</th><th>Tgl Keluar</th><th>Tgl Kembali</th><th>Keterangan</th></tr></thead>
    <tbody>${txRows}</tbody>
  </table>

  <div class="footer">Sistem Informasi HSE — PT Wahanakarsa Swandiri</div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) { alert("Izinkan popup untuk mencetak."); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}
