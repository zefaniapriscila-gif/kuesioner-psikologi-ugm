// Perintah admin untuk Google Sheet kuesioner.
// Pakai: npm run sheet:hapus-test   -> hapus baris berinisial TEST
//        npm run sheet:reset        -> kosongkan seluruh sheet (termasuk header)
const ACTIONS = ["reset", "deleteTest"];
const action = process.argv[2];
const url = process.env.VITE_GOOGLE_SCRIPT_URL;
const token = process.env.GAS_ADMIN_TOKEN;

if (!ACTIONS.includes(action)) {
  console.error(`Aksi tidak dikenal: ${action ?? "(kosong)"}. Pilihan: ${ACTIONS.join(", ")}`);
  process.exit(1);
}
if (!url || !token) {
  console.error("VITE_GOOGLE_SCRIPT_URL dan GAS_ADMIN_TOKEN harus diisi di .env.local");
  process.exit(1);
}

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=UTF-8" },
  body: JSON.stringify({ action, token }),
});
const text = await res.text();

try {
  const result = JSON.parse(text);
  console.log(result);
  if (result.status === "forbidden" || result.status === "unknown_action") process.exit(1);
} catch {
  const missing = text.match(/tidak ditemukan: \w+|not found: \w+/i);
  console.error(`Balasan bukan JSON (HTTP ${res.status})${missing ? `: ${missing[0]}` : ""}`);
  console.error("Pastikan kode Apps Script terbaru sudah di-deploy sebagai versi baru.");
  process.exit(1);
}
