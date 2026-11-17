import axios from "axios";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_KEY belum diset di .env");
}

export const REST_URL    = `${SUPABASE_URL}/rest/v1`;
export const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

export const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export const writeHeaders = { ...headers, Prefer: "return=representation" };

export default axios;
