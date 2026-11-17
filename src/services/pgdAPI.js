import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";

const ITEM_URL    = `${REST_URL}/asset_item`;
const TX_URL      = `${REST_URL}/asset_transaction`;
const CAL_URL     = `${REST_URL}/asset_calibration`;
const LOG_URL     = `${REST_URL}/pgd_activity_log`;
const CAT_URL     = `${REST_URL}/asset_category`;
const MP_URL      = `${REST_URL}/manpower`;

function currentUser() {
  try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

export const pgdAPI = {
  async fetchCategory() {
    const res = await axios.get(`${CAT_URL}?nama_kategori=eq.PGD`, { headers });
    return res.data[0] || null;
  },

  async fetchAll() {
    const [cats, mpRes] = await Promise.all([
      axios.get(`${CAT_URL}?nama_kategori=eq.PGD`, { headers }),
      axios.get(`${MP_URL}?select=id,nama,no_badge&order=nama.asc`, { headers }),
    ]);
    const cat = cats.data[0];
    if (!cat) return { category: null, manpower: mpRes.data, items: [] };

    const res = await axios.get(
      `${ITEM_URL}?asset_category_id=eq.${cat.id}&order=kode_item.asc`,
      { headers }
    );
    const mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    return {
      category: cat,
      manpower: mpRes.data,
      items: res.data.map((i) => ({ ...i, holder: mpMap[i.manpower_id] || null })),
    };
  },

  async fetchById(id) {
    const [itemRes, mpRes] = await Promise.all([
      axios.get(`${ITEM_URL}?id=eq.${id}`, { headers }),
      axios.get(`${MP_URL}?select=id,nama,no_badge,posisi&order=nama.asc`, { headers }),
    ]);
    const item = itemRes.data[0];
    if (!item) return null;
    const mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    return { ...item, holder: mpMap[item.manpower_id] || null };
  },

  // excludeId: skip item yg sedang diedit
  async checkDuplicate(serialNumber, excludeId = null) {
    const sn = serialNumber.trim();
    if (!sn) return false;
    const res = await axios.get(
      `${ITEM_URL}?or=(kode_item.eq.${encodeURIComponent(sn)},serial_number.eq.${encodeURIComponent(sn)})`,
      { headers }
    );
    if (!res.data?.length) return false;
    return excludeId ? res.data.some((i) => i.id !== excludeId) : true;
  },

  async create(data, userName = null) {
    const res = await axios.post(ITEM_URL, data, { headers: writeHeaders });
    const created = res.data[0];
    if (created) await this.logActivity(created.id, "create", "PGD ditambahkan", userName);
    return created;
  },

  async update(id, data, userName = null) {
    const res = await axios.patch(`${ITEM_URL}?id=eq.${id}`, data, { headers: writeHeaders });
    if (userName) await this.logActivity(id, "edit", "Data PGD diperbarui", userName);
    return res.data;
  },

  async remove(id, certUrl = null) {
    if (certUrl) {
      try {
        const { storageAPI } = await import("./storageAPI");
        await storageAPI.removeFile(certUrl);
      } catch (e) {
        console.warn("Gagal hapus sertifikat:", e.message);
      }
    }
    await axios.delete(`${ITEM_URL}?id=eq.${id}`, { headers });
  },

  async checkOut(id, { date, manpowerId = null, notes = "", userName = null }) {
    const user = userName || currentUser()?.nama || null;
    await axios.post(TX_URL, {
      asset_item_id: id,
      manpower_id: manpowerId || null,
      jenis_transaksi: "out",
      tanggal_transaksi: date,
      keterangan: notes || null,
      ditandai_oleh: user,
    }, { headers: writeHeaders });
    await axios.patch(`${ITEM_URL}?id=eq.${id}`, {
      status: "OUT",
      date_out: date,
      tanggal_ambil: date,
      manpower_id: manpowerId || null,
    }, { headers: writeHeaders });
    await this.logActivity(id, "out", `Diserahkan${notes ? ` — ${notes}` : ""}`, user);
  },

  async checkIn(id, { date, manpowerId = null, notes = "", userName = null }) {
    const user = userName || currentUser()?.nama || null;
    await axios.post(TX_URL, {
      asset_item_id: id,
      manpower_id: manpowerId || null,
      jenis_transaksi: "in",
      tanggal_transaksi: date,
      tanggal_kembali: date,
      keterangan: notes || null,
      ditandai_oleh: user,
    }, { headers: writeHeaders });
    await axios.patch(`${ITEM_URL}?id=eq.${id}`, {
      status: "IN",
      tanggal_ambil: null,
    }, { headers: writeHeaders });
    await this.logActivity(id, "in", `Dikembalikan${notes ? ` — ${notes}` : ""}`, user);
  },

  async logActivity(itemId, jenisAksi, keterangan = null, userName = null) {
    try {
      await axios.post(LOG_URL, {
        asset_item_id: itemId,
        jenis_aksi: jenisAksi,
        keterangan,
        user_name: userName || currentUser()?.nama || null,
      }, { headers: writeHeaders });
    } catch (e) {
      console.warn("Gagal catat aktivitas:", e.message);
    }
  },

  // gabung log dari 3 sumber: activity_log, transaksi, kalibrasi
  async fetchActivityLog(itemId) {
    const [logRes, txRes, calRes] = await Promise.all([
      axios.get(`${LOG_URL}?asset_item_id=eq.${itemId}&order=tanggal.desc`, { headers }),
      axios.get(`${TX_URL}?asset_item_id=eq.${itemId}&order=tanggal_transaksi.desc`, { headers }),
      axios.get(`${CAL_URL}?asset_item_id=eq.${itemId}&order=tanggal_kalibrasi.desc`, { headers }),
    ]);

    const mpIds = [...new Set(txRes.data.map((t) => t.manpower_id).filter(Boolean))];
    let mpMap = {};
    if (mpIds.length) {
      const mpRes = await axios.get(`${MP_URL}?select=id,nama,no_badge`, { headers });
      mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    }

    const items = [];

    logRes.data.forEach((l) => {
      if (l.jenis_aksi === "out" || l.jenis_aksi === "in") return;
      items.push({ id: `log-${l.id}`, jenis: l.jenis_aksi, tanggal: l.tanggal, keterangan: l.keterangan, user: l.user_name, manpower: null });
    });

    txRes.data.forEach((t) => {
      items.push({ id: `tx-${t.id}`, jenis: t.jenis_transaksi, tanggal: t.tanggal_transaksi, keterangan: t.keterangan, user: t.ditandai_oleh, manpower: mpMap[t.manpower_id] || null, tanggal_kembali: t.tanggal_kembali });
    });

    calRes.data.forEach((c) => {
      items.push({ id: `cal-${c.id}`, jenis: "calibration", tanggal: c.tanggal_kalibrasi, keterangan: c.keterangan, user: c.dicatat_oleh, manpower: null, next_kalibrasi: c.tanggal_next_kalibrasi, cal_cert_url: c.cal_cert_url });
    });

    items.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    return items;
  },
};
