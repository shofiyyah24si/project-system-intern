import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";

const CATEGORY_URL    = `${REST_URL}/asset_category`;
const ITEM_URL        = `${REST_URL}/asset_item`;
const TRANSACTION_URL = `${REST_URL}/asset_transaction`;

export const assetAPI = {
  async fetchCategories() {
    const res = await axios.get(`${CATEGORY_URL}?order=nama_kategori.asc`, { headers });
    return res.data;
  },

  async createCategory(data) {
    const res = await axios.post(CATEGORY_URL, data, { headers: writeHeaders });
    return res.data;
  },

  async fetchItems() {
    const [itemsRes, categories] = await Promise.all([
      axios.get(`${ITEM_URL}?order=nama_item.asc`, { headers }),
      this.fetchCategories(),
    ]);
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    return itemsRes.data.map((i) => ({ ...i, category: catMap[i.asset_category_id] || null }));
  },

  // item per kategori (mis. "KP" / "PGD") + data pemegang
  async fetchByCategory(namaKategori) {
    const [cats, mpRes] = await Promise.all([
      this.fetchCategories(),
      axios.get(`${REST_URL}/manpower?select=id,nama,no_badge&order=nama.asc`, { headers }),
    ]);
    const cat = cats.find((c) => c.nama_kategori === namaKategori);
    if (!cat) return { category: null, items: [], manpower: mpRes.data };
    const res = await axios.get(`${ITEM_URL}?asset_category_id=eq.${cat.id}&order=kode_item.asc`, { headers });
    const mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    return {
      category: cat,
      manpower: mpRes.data,
      items: res.data.map((i) => ({ ...i, holder: mpMap[i.manpower_id] || null })),
    };
  },

  async fetchItemById(id) {
    const res = await axios.get(`${ITEM_URL}?id=eq.${id}`, { headers });
    return res.data[0];
  },

  // satu item + info pemegang — untuk halaman detail
  async fetchItemWithHolder(id) {
    const [itemRes, mpRes] = await Promise.all([
      axios.get(`${ITEM_URL}?id=eq.${id}`, { headers }),
      axios.get(`${REST_URL}/manpower?select=id,nama,no_badge,posisi&order=nama.asc`, { headers }),
    ]);
    const item = itemRes.data[0];
    if (!item) return null;
    const mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    return { ...item, holder: mpMap[item.manpower_id] || null };
  },

  async createItem(data) {
    const res = await axios.post(ITEM_URL, data, { headers: writeHeaders });
    return res.data;
  },

  async updateItem(id, data) {
    const res = await axios.patch(`${ITEM_URL}?id=eq.${id}`, data, { headers: writeHeaders });
    return res.data;
  },

  async removeItem(id) {
    await axios.delete(`${ITEM_URL}?id=eq.${id}`, { headers });
  },

  async fetchExpiringSoon(days = 30) {
    const items = await this.fetchItems();
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return items.filter((i) => {
      if (!i.tanggal_expired) return false;
      const exp = new Date(i.tanggal_expired);
      return exp <= limit;
    });
  },

  async fetchTransactions() {
    const res = await axios.get(`${TRANSACTION_URL}?order=tanggal_transaksi.desc`, { headers });
    return res.data;
  },

  // riwayat transaksi per item, manpower di-join manual
  async fetchTransactionsByItem(itemId) {
    const [txRes, mpRes] = await Promise.all([
      axios.get(`${TRANSACTION_URL}?asset_item_id=eq.${itemId}&order=tanggal_transaksi.desc`, { headers }),
      axios.get(`${REST_URL}/manpower?select=id,nama,no_badge&order=nama.asc`, { headers }),
    ]);
    const mpMap = Object.fromEntries(mpRes.data.map((m) => [m.id, m]));
    return txRes.data.map((t) => ({ ...t, manpower: mpMap[t.manpower_id] || null }));
  },

  // catat transaksi + update status barang sekaligus
  async createTransaction({ asset_item_id, manpower_id, jenis_transaksi, tanggal_transaksi, tanggal_kembali, keterangan, ditandai_oleh }) {
    const res = await axios.post(
      TRANSACTION_URL,
      { asset_item_id, manpower_id, jenis_transaksi, tanggal_transaksi, tanggal_kembali: tanggal_kembali || null, keterangan, ditandai_oleh },
      { headers: writeHeaders }
    );
    const statusBaru = jenis_transaksi === "out" ? "dipegang" : "tersedia";
    await axios.patch(
      `${ITEM_URL}?id=eq.${asset_item_id}`,
      {
        status: statusBaru,
        manpower_id: jenis_transaksi === "out" ? manpower_id : null,
        tanggal_ambil: jenis_transaksi === "out" ? tanggal_transaksi : null,
      },
      { headers: writeHeaders }
    );
    return res.data;
  },
};
