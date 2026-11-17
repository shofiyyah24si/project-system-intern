import axios, { STORAGE_URL, headers } from "../lib/supabaseClient";

const BUCKET = "hse-uploads";

export const storageAPI = {
  async uploadFile(file) {
    const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
    const uploadUrl = `${STORAGE_URL}/object/${BUCKET}/${fileName}`;

    await axios.post(uploadUrl, file, {
      headers: {
        apikey: headers.apikey,
        Authorization: headers.Authorization,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
    });

    return `${STORAGE_URL}/object/public/${BUCKET}/${fileName}`;
  },

  // hapus file berdasarkan public URL-nya
  async removeFile(publicUrl) {
    if (!publicUrl) return;
    const match = publicUrl.match(/\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return;
    const [, bucket, filePath] = match;
    await axios.delete(`${STORAGE_URL}/object/${bucket}/${filePath}`, {
      headers: { apikey: headers.apikey, Authorization: headers.Authorization },
    });
  },
};
