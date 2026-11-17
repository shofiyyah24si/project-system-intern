import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";

const URL = `${REST_URL}/asset_calibration`;

export const calibrationAPI = {
  async fetchByItem(itemId) {
    const res = await axios.get(
      `${URL}?asset_item_id=eq.${itemId}&order=tanggal_kalibrasi.desc,created_at.desc`,
      { headers }
    );
    return res.data;
  },

  async create(data) {
    const res = await axios.post(URL, data, { headers: writeHeaders });
    return res.data;
  },

  async remove(id) {
    await axios.delete(`${URL}?id=eq.${id}`, { headers });
  },
};
