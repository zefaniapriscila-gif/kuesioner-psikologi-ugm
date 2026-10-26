# Dokumen Kebutuhan Proyek (Project Requirements)
## Web Kuesioner Tugas Metode Penelitian Kuantitatif: Jumlah Tugas Akademik & Konsumsi Tinggi Gula

**Judul / Topik Penelitian:**  
*Jumlah Tugas Akademik dan Kecenderungan Perilaku Konsumsi Tinggi Gula pada Mahasiswa Psikologi UGM*

---

## 1. Gambaran Umum Sistem (System Overview)
Aplikasi ini adalah **Web Kuesioner Kustom (Google Form / Google Sheets Wrapper)** yang dirancang khusus untuk pengumpulan data Tugas Metode Penelitian Kuantitatif.  
- **Sisi Responden (Mahasiswa Psikologi UGM):** Mengakses web dengan tampilan modern, ramah pengguna (mobile-friendly), dan bertema sesuai topik penelitian, bukan tampilan kaku seperti Google Form standar.
- **Sisi Peneliti (Temanmu):** Semua jawaban yang disubmit dari web akan langsung masuk secara otomatis dan *real-time* ke **Google Sheets** milik peneliti, sehingga siap diolah langsung di SPSS, JASP, Jamovi, atau Microsoft Excel tanpa perlu mengurus server atau database berbayar.

---

## 2. Arsitektur & Teknologi yang Digunakan
Karena tidak menggunakan Firebase dan kuota Supabase penuh, arsitektur berikut dipilih karena **100% gratis, tanpa batas kuota proyek, dan paling cepat dideploy**:

| Komponen | Teknologi | Kegunaan |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (React) / Vite + Tailwind CSS | Membangun antarmuka kuesioner yang responsif dan interaktif |
| **Hosting & Deployment** | **Vercel** | Hosting web gratis, cepat, otomatis mendapat domain `.vercel.app` |
| **Penyimpanan Data (Backend)** | **Google Sheets (via Google Apps Script Web App)** atau **Google Forms Action Endpoint** | Menerima data dari web Vercel dan langsung menyimpannya sebagai baris baru di Google Spreadsheet |
| **Penyimpanan State Sementara** | `localStorage` Browser | Menyimpan progres pengisian responden agar tidak hilang jika halaman tidak sengaja ter-refresh |

> **Catatan terkait saran dosen (Firebase):**  
> Jika saat bimbingan/sidang dosen menanyakan bagaimana data disimpan, arsitektur *Serverless API ke Cloud Spreadsheet* atau *NoSQL Document* punya alur kerja yang identik di sisi frontend (`fetch POST JSON`). Jika suatu saat dosen mewajibkan screenshot dashboard Firebase, kode pengiriman datanya bisa diganti ke Firebase Firestore hanya dalam 1 file konfigurasi tanpa mengubah tampilan web sama sekali.

---

## 3. Konsep Tema & Desain UI/UX (Sesuai Topik TA)
Karena topiknya adalah **"Jumlah Tugas Akademik"** dan **"Konsumsi Tinggi Gula (Sweet Cravings / Sugar Intake)"** pada **Mahasiswa Psikologi UGM**, tema visual web bisa dibuat relevan, hangat, dan tidak membosankan:

1. **Konsep Visual: *"Sweet Study Desk"* (Meja Belajar & Makanan/Minuman Manis)**
   - Menggabungkan nuansa akademik (buku, laptop, catatan, suasana kuliah Psikologi UGM) dengan elemen manis (boba, kopi susu gula aren, donat, cokelat, dessert).
2. **Palet Warna:**
   - **Background Utama:** *Warm Cream / Milk White* (`#FFFDF9` atau `#FDF8F5`) — nyaman di mata saat membaca banyak butir pertanyaan.
   - **Warna Primer (Akademik & UGM vibe):** *Deep Navy / Academic Blue* (`#1E3A5F`) — memberi kesan kredibel dan ilmiah.
   - **Warna Aksen (Gula / Sweet):** *Caramel Amber* (`#D97706`) atau *Strawberry Coral* (`#F43F5E`) — untuk tombol, *progress bar*, dan ikon interaktif.
3. **Fitur UX Kuesioner:**
   - **Multi-step Wizard (Per Bagian):** Tidak menampilkan puluhan soal sekaligus di satu halaman panjang agar responden tidak lelah (*survey fatigue*).
   - **Visual Progress Bar:** Indikator persentase (misal: *"Bagian 2 dari 4 — 50% selesai"*).
   - **Auto-save di Browser:** Jika sinyal HP mahasiswa putus atau tab tertutup, jawaban yang sudah dipilih tidak hilang.
   - **Mobile-First Design:** Mayoritas mahasiswa mengisi kuesioner lewat link WhatsApp/Line/Instagram di HP.

---

## 4. Struktur Halaman & Alur Kuesioner (User Flow)

### Tahap 1: Halaman Pengantar & *Informed Consent* (Wajib di Psikologi)
Dalam penelitian Psikologi, halaman persetujuan responden (*Informed Consent*) sangat penting:
- Judul penelitian, nama peneliti, NIM, dan nama Dosen Pembimbing (Fakultas Psikologi UGM).
- Tujuan penelitian & kriteria responden (misal: *Mahasiswa aktif S1 Psikologi UGM angkatan 202X–202X*).
- Jaminan kerahasiaan data, estimasi waktu pengisian (misal: 5–10 menit), dan info *reward/undian* (gopay/shopeepay jika ada).
- Checkbox persetujuan: *"Saya telah membaca penjelasan di atas dan bersedia berpartisipasi secara sukarela."*

### Tahap 2: Data Demografi & Screening Responden
- Nama / Inisial (Opsional/Sesuai kebutuhan)
- Angkatan / Semester saat ini
- Jenis Kelamin & Usia
- Nomor HP / E-mail (Opsional, biasanya untuk undian *reward*)
- Pertanyaan *Screening* (misal: Apakah saat ini sedang aktif mengambil mata kuliah di Fakultas Psikologi UGM?)

### Tahap 3: Bagian 1 — Variabel X (Jumlah Tugas Akademik / Beban Akademik)
- Pertanyaan terkait frekuensi, jumlah, atau persepsi beban tugas kuliah dalam periode tertentu (misal: 1 minggu atau 1 bulan terakhir).
- Bentuk input bisa berupa:
  - Input angka/kategori (misal: rata-rata jumlah tugas per minggu, durasi mengerjakan tugas per hari), **dan/atau**
  - Skala psikologi (Skala Likert 1–4 atau 1–5: *Sangat Tidak Sesuai* s/d *Sangat Sesuai*).

### Tahap 4: Bagian 2 — Variabel Y (Kecenderungan Perilaku Konsumsi Tinggi Gula)
- Pertanyaan skala psikologi atau *Food Frequency Questionnaire (FFQ)* terkait kebiasaan mengonsumsi minuman/makanan manis (kopi susu kekinian, teh manis, boba, kue, camilan manis) terutama saat/setelah mengerjakan tugas kuliah.
- Skala Likert (misal: *Tidak Pernah, Jarang, Kadang-kadang, Sering, Selalu* atau *Sangat Tidak Setuju – Sangat Setuju*).

### Tahap 5: Halaman Penutup (Thank You Page)
- Ucapan terima kasih telah membantu penelitian Tugas Metode Penelitian Kuantitatif.
- Ringkasan singkat atau pesan edukatif ringan (opsional, misal *fun fact* tentang gula & stres akademik).

---

## 5. Daftar Data yang Harus Kamu Minta ke Temanmu (Checklist)

Sebelum mulai coding isi kuesionernya, minta dokumen/data berikut dari temanmu:

- [ ] **Teks *Informed Consent*:** Nama lengkap temanmu, NIM, nama Dosen Pembimbing, kriteria inklusi responden, dan info *reward* (jika ada).
- [ ] **Daftar Pertanyaan Demografi:** Data diri apa saja yang wajib diisi oleh mahasiswa Psikologi UGM.
- [ ] **Alat Ukur / Instrumen Variabel 1 (Jumlah Tugas Akademik):**
  - Daftar seluruh butir pertanyaan (*items*).
  - Jenis pilihan jawabannya (apakah angka jumlah tugas, pilihan ganda, atau skala Likert 1–4 / 1–5).
- [ ] **Alat Ukur / Instrumen Variabel 2 (Kecenderungan Konsumsi Tinggi Gula):**
  - Daftar seluruh butir pertanyaan (*items*).
  - Jenis skala pilihannya (misal: 4 pilihan tanpa netral atau 5 pilihan).
- [ ] **Keterangan *Scoring* (Opsional tapi sangat membantu):**
  - Apakah ada item *Favorable* dan *Unfavorable* (nilai dibalik)? Jika kita tahu dari awal, web kita bisa **otomatis menghitung skor angka (1, 2, 3, 4)** saat masuk ke Google Sheets sehingga temanmu tidak perlu *recode* manual di Excel!
- [ ] **Email Google Temanmu:** Untuk menyiapkan file Google Sheets tempat menampung jawaban responden.

---

## 6. Cara Kerja Integrasi Web Vercel ke Google Sheets (Tanpa Kuota/Biaya)

Agar tidak pusing dengan backend berbayar, kita cukup memakai salah satu dari 2 cara ini:

1. **Metode A: Google Forms di Belakang Layar (Paling Cepat)**
   - Temanmu membuat Google Form biasa dengan pertanyaan yang sama.
   - Kita ambil ID `entry.xxxxxx` dari Google Form tersebut dan pasang di kode web Vercel.
   - Saat mahasiswa submit di web kita, datanya langsung masuk ke tab *Responses* Google Form & Google Sheets temanmu.
2. **Metode B: Google Sheets + Google Apps Script (Lebih Fleksibel)**
   - Temanmu membuat 1 file Google Sheets kosong.
   - Di menu *Extensions > Apps Script*, kita tempel sekitar 15 baris kode script untuk menerima data dari web Vercel, lalu klik *Deploy as Web App*.
   - Web Vercel akan mengirim data JSON ke URL tersebut dan langsung mengisi baris-baris di Google Sheets.
