import axios, { REST_URL, headers, writeHeaders } from "../lib/supabaseClient";
import { manpowerAPI } from "./manpowerAPI";

const SESSION_URL    = `${REST_URL}/meeting_session`;
const ATTENDANCE_URL = `${REST_URL}/attendance`;

export const meetingAPI = {
  async fetchSessions() {
    const res = await axios.get(`${SESSION_URL}?order=tanggal_meeting.desc`, { headers });
    return res.data;
  },

  async fetchSessionById(id) {
    const res = await axios.get(`${SESSION_URL}?id=eq.${id}`, { headers });
    return res.data[0];
  },

  // buat sesi + generate baris attendance "tidak_hadir" untuk semua manpower aktif
  async createSession({ tanggal_meeting, lokasi, keterangan }) {
    const sessionRes = await axios.post(
      SESSION_URL,
      { tanggal_meeting, lokasi, keterangan },
      { headers: writeHeaders }
    );
    const session = sessionRes.data[0];

    const allManpower = await manpowerAPI.fetchAll();
    const active = allManpower.filter((m) => m.status !== "nonaktif");

    if (active.length > 0) {
      const rows = active.map((m) => ({
        meeting_session_id: session.id,
        manpower_id: m.id,
        status_hadir: "tidak_hadir",
      }));
      await axios.post(ATTENDANCE_URL, rows, { headers: writeHeaders });
    }

    return session;
  },

  async deleteSession(id) {
    await axios.delete(`${ATTENDANCE_URL}?meeting_session_id=eq.${id}`, { headers });
    await axios.delete(`${SESSION_URL}?id=eq.${id}`, { headers });
  },

  async updateSession(id, data) {
    const res = await axios.patch(`${SESSION_URL}?id=eq.${id}`, data, { headers: writeHeaders });
    return res.data[0];
  },

  // join manpower manual di JS
  async fetchAttendanceBySession(sessionId) {
    const [attRes, manpower] = await Promise.all([
      axios.get(`${ATTENDANCE_URL}?meeting_session_id=eq.${sessionId}`, { headers }),
      manpowerAPI.fetchAll(),
    ]);
    const mpMap = Object.fromEntries(manpower.map((m) => [m.id, m]));
    return attRes.data
      .map((a) => ({ ...a, manpower: mpMap[a.manpower_id] || null }))
      .filter((a) => a.manpower)
      .sort((a, b) => a.manpower.nama.localeCompare(b.manpower.nama));
  },

  async markAttendance(attendanceId, status_hadir) {
    const res = await axios.patch(
      `${ATTENDANCE_URL}?id=eq.${attendanceId}`,
      { status_hadir, waktu_ditandai: new Date().toISOString() },
      { headers: writeHeaders }
    );
    return res.data;
  },

  async fetchAttendanceByManpower(manpowerId) {
    const [attRes, sessionsRes] = await Promise.all([
      axios.get(`${ATTENDANCE_URL}?manpower_id=eq.${manpowerId}`, { headers }),
      axios.get(`${SESSION_URL}?order=tanggal_meeting.desc`, { headers }),
    ]);
    const sessionMap = Object.fromEntries(sessionsRes.data.map((s) => [s.id, s]));
    return attRes.data
      .map((a) => ({ ...a, session: sessionMap[a.meeting_session_id] }))
      .filter((a) => a.session)
      .sort((a, b) => new Date(b.session.tanggal_meeting) - new Date(a.session.tanggal_meeting));
  },
};
