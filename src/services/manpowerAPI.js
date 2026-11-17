import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";

const URL = `${REST_URL}/manpower`;

export const manpowerAPI = {
  async fetchAll() {
    const res = await axios.get(`${URL}?order=nama.asc`, { headers });
    return res.data;
  },

  async fetchById(id) {
    const res = await axios.get(`${URL}?id=eq.${id}`, { headers });
    return res.data[0];
  },

  async create(data) {
    const res = await axios.post(URL, data, { headers: writeHeaders });
    return res.data;
  },

  async update(id, data) {
    const res = await axios.patch(`${URL}?id=eq.${id}`, data, { headers: writeHeaders });
    return res.data;
  },

  // import massal dari Excel
  async createMany(rows) {
    if (!rows.length) return [];
    const res = await axios.post(URL, rows, { headers: writeHeaders });
    return res.data;
  },

  async remove(id) {
    await axios.delete(`${URL}?id=eq.${id}`, { headers });
  },

  async search(keyword) {
    const res = await axios.get(
      `${URL}?or=(nama.ilike.*${keyword}*,no_badge.ilike.*${keyword}*)&order=nama.asc`,
      { headers }
    );
    return res.data;
  },
};
