import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";

const USERS_URL = `${REST_URL}/users`;

export const userAPI = {
  async fetchUsers() {
    const res = await axios.get(USERS_URL, { headers });
    return res.data;
  },

  // NOTE: login ini masih compare password polos di query string, sama seperti
  // project lama. Untuk produksi/laporan KP, ini poin yang perlu di-upgrade
  // (idealnya pakai Supabase Auth atau hash password di server/edge function).
  async loginUser(email, password) {
    const res = await axios.get(
      `${USERS_URL}?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}`,
      { headers }
    );
    return res.data;
  },

  async registerUser(data) {
    const res = await axios.post(
      USERS_URL,
      { nama: data.nama, email: data.email, password: data.password, role: data.role || "staff" },
      { headers: writeHeaders }
    );
    return res.data;
  },

  async createUser(data) {
    const res = await axios.post(USERS_URL, data, { headers: writeHeaders });
    return res.data;
  },

  async updateUser(id, data) {
    const res = await axios.patch(`${USERS_URL}?id=eq.${id}`, data, { headers: writeHeaders });
    return res.data;
  },

  async deleteUser(id) {
    await axios.delete(`${USERS_URL}?id=eq.${id}`, { headers });
  },

  async checkEmailExists(email) {
    const res = await axios.get(`${USERS_URL}?email=eq.${encodeURIComponent(email)}`, { headers });
    return res.data.length > 0;
  },
};
