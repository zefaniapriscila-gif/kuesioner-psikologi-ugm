// Isi presentasi hasil penelitian (#/presentasi).
//
// Semua teks dan angka slide ada di file ini, jadi kelompok cukup mengedit di
// sini tanpa menyentuh tampilan. Angka diambil dari tabel analisis deskriptif
// kelompok (N = 56), bukan dari spreadsheet live.

export const PRESENTASI_TANGGAL = "November 2026";
export const N_RESPONDEN = 56;

// --- 1. Pendahuluan --------------------------------------------------------

// Tiga fakta pembuka: angka besar + penjelasan singkat + sumber
export const FAKTA_PEMBUKA = [
  {
    angka: "1.014",
    isi: "mahasiswa diteliti: stresor akademik, termasuk beban akademik berlebih, berpengaruh langsung pada respons stres.",
    sumber: "Ruiz-Camacho et al., 2025",
  },
  {
    angka: "61,27%",
    isi: "penduduk Indonesia berusia ≥ 3 tahun mengonsumsi minuman manis lebih dari sekali sehari.",
    sumber: "Kementerian Kesehatan, 2022",
  },
  {
    angka: "7 dari 10",
    isi: "mahasiswa yang diwawancarai naik berat badan selama kuliah, dan terbiasa makan saat stres karena banyak tugas.",
    sumber: "Ramadhani & Mastuti, 2022",
  },
];

// Alur teori: tugas menumpuk -> stres -> koping -> gula
export const ALUR_TEORI = [
  { judul: "Tugas menumpuk", isi: "Tuntutan dinilai melampaui sumber daya diri" },
  { judul: "Stres", isi: "Model transaksional Lazarus & Folkman (1984)" },
  { judul: "Koping", isi: "Emotional & external eating (Hill et al., 2023)" },
  { judul: "Konsumsi gula", isi: "Self-medication with sucrose (Ulrich-Lai, 2016)" },
];

export const TEORI_SOROTAN = {
  angka: "60–70%",
  isi: "individu melaporkan makan lebih banyak makanan manis saat stres tinggi. Gula dapat meredakan cemas dan memperbaiki suasana hati melalui sumbu HPA.",
  sumber: "Ulrich-Lai, 2016",
};

export const CELAH = {
  temuan: [
    { teks: "Beban akademik ↔ emotional eating", sumber: "Theodore, 2025", signifikan: true },
    { teks: "Stres akademik ↔ minuman berpemanis", sumber: "Hamidah, 2024", signifikan: true },
    { teks: "Stres ↔ minuman berpemanis (r = 0,157)", sumber: "Ruman & Undarwati, 2026", signifikan: true },
    { teks: "Stres ↔ camilan manis", sumber: "Ikhnaton et al., 2025", signifikan: false },
  ],
  celah:
    "Penelitian sebelumnya berfokus pada stres akademik secara umum. Beban tugas yang dirasakan dan kecenderungan konsumsi tinggi gula belum dikaji secara khusus.",
  tujuan:
    "Memperoleh gambaran beban tugas akademik dan kecenderungan perilaku konsumsi tinggi gula pada mahasiswa S1 Psikologi UGM.",
};

// --- 2. Metode ---------------------------------------------------------------

// Slide metode: tiga ringkasan (pendekatan, instrumen, analisis) dan alur survei
export const METODE = {
  pendekatan: {
    label: "Pendekatan",
    utama: "Kuantitatif",
    sorot: "deskriptif",
    isi: "Menggambarkan apa adanya, tanpa menguji hubungan antarvariabel.",
  },
  pengumpulan: {
    label: "Pengumpulan data",
    judul: "Survei daring dengan kuesioner tertutup",
    langkah: ["Informed consent", "Data diri", "Beban tugas", "Konsumsi gula"],
  },
  instrumen: {
    label: "Instrumen",
    judul: "11 pertanyaan, skor 1–5",
    tugas: 3,
    gula: 8,
  },
  analisis: {
    label: "Analisis",
    judul: "Statistik deskriptif",
    // simbol mengikuti gaya APA
    ukuran: [
      { simbol: "M", nama: "Rata-rata" },
      { simbol: "SD", nama: "Simpangan baku" },
      { simbol: "Mdn", nama: "Median" },
      { simbol: "Mo", nama: "Modus" },
    ],
  },
};

export const RESPONDEN = [
  {
    judul: "Jenis kelamin",
    bagian: [
      { label: "Mahasiswi", n: 47 },
      { label: "Mahasiswa", n: 9 },
    ],
  },
  {
    judul: "Usia",
    bagian: [
      { label: "18–19 tahun", n: 33 },
      { label: "20–22 tahun", n: 23 },
    ],
  },
  {
    judul: "Domisili",
    bagian: [
      { label: "Jawa selain DIY", n: 29 },
      { label: "DI Yogyakarta", n: 15 },
      { label: "Luar Jawa", n: 12 },
    ],
  },
];

export const ANGKATAN_DOMINAN = { label: "angkatan 2025", persen: "64,3%" };

// --- 3. Hasil ------------------------------------------------------------------

// persen = bagian responden yang memilih jawaban terbanyak (modus)
export const HASIL_TUGAS = [
  { angka: "4,66", satuan: "rata-rata dari 5", judul: "Merasa memiliki banyak tugas", persen: 73.2, modus: "73,2% menjawab sangat setuju" },
  { angka: "3–4", satuan: "tugas per minggu", judul: "Jumlah tugas per minggu", persen: 48.2, modus: "48,2% responden" },
  { angka: "3–4", satuan: "jam per tugas", judul: "Durasi pengerjaan tugas", persen: 37.5, modus: "37,5% responden" },
];

export const HASIL_TUGAS_INTI = "Sebagian besar responden merasakan beban tugas akademik yang tinggi.";

// Mean skor 1–5 tiap butir konsumsi gula, dengan modus jawaban
export const HASIL_GULA: { label: string; mean: number; modus: string; sorot?: boolean }[] = [
  { label: "Makanan manis per minggu", mean: 2.7, modus: "1–3 kali (44,6%)" },
  { label: "Minuman manis per minggu", mean: 2.59, modus: "1–3 kali (48,2%)" },
  { label: "Butuh makanan manis saat nugas", mean: 2.84, modus: "Tidak setuju / netral (35,7%)" },
  { label: "Butuh minuman manis saat nugas", mean: 2.91, modus: "Setuju (35,7%)", sorot: true },
  { label: "Makanan manis saat nugas", mean: 2.36, modus: "1–3 kali (58,9%)" },
  { label: "Minuman manis saat nugas", mean: 2.34, modus: "1–3 kali (53,6%)" },
  { label: "Makanan manis saat UTS/UAS", mean: 2.39, modus: "1–3 kali (53,6%)" },
  { label: "Minuman manis saat UTS/UAS", mean: 2.46, modus: "1–3 kali (55,4%)" },
];

export const HASIL_GULA_INTI =
  "Konsumsi gula tergolong rendah hingga sedang: paling banyak 1–3 kali per minggu, baik sehari-hari, saat nugas, maupun saat UTS/UAS.";

// Perbandingan kelompok: hanya aspek yang paling berbeda
export const PERBANDINGAN: {
  judul: string;
  kelompok: string[];
  temuan: string;
  aspek: { label: string; nilai: number[] }[];
}[] = [
  {
    judul: "Usia",
    kelompok: ["18–19 th (n = 33)", "20–22 th (n = 23)"],
    temuan: "Kelompok 18–19 tahun lebih tinggi di semua aspek beban tugas dan konsumsi gula.",
    aspek: [
      { label: "Merasa banyak tugas", nilai: [4.85, 4.39] },
      { label: "Makanan manis per minggu", nilai: [2.85, 2.48] },
      { label: "Makanan manis saat nugas", nilai: [2.52, 2.13] },
    ],
  },
  {
    judul: "Jenis kelamin",
    kelompok: ["Mahasiswi (n = 47)", "Mahasiswa (n = 9)"],
    temuan: "Mahasiswi merasa tugasnya lebih berat dan lebih butuh gula, tetapi mahasiswa lebih sering makan makanan manis.",
    aspek: [
      { label: "Durasi pengerjaan tugas", nilai: [4.09, 3.33] },
      { label: "Butuh minuman manis saat nugas", nilai: [3.02, 2.33] },
      { label: "Makanan manis per minggu", nilai: [2.55, 3.44] },
    ],
  },
  {
    judul: "Domisili",
    kelompok: ["DIY (n = 15)", "Jawa selain DIY (n = 29)", "Luar Jawa (n = 12)"],
    temuan: "Perbedaannya kecil. Responden dari Jawa selain DIY paling jarang makan makanan manis.",
    aspek: [
      { label: "Merasa banyak tugas", nilai: [4.47, 4.69, 4.83] },
      { label: "Makanan manis per minggu", nilai: [2.93, 2.48, 2.92] },
    ],
  },
];

export const PERBANDINGAN_CATATAN =
  "Perbandingan bersifat deskriptif dan ukuran kelompok tidak seimbang, jadi belum menunjukkan pengaruh usia, jenis kelamin, atau domisili.";

// --- 4. Diskusi ------------------------------------------------------------

// Kata di antara *bintang* ditampilkan miring dan berwarna
export const DISKUSI_UTAMA =
  "Beban tugas dirasakan *tinggi*, tetapi tidak langsung diikuti konsumsi gula yang *tinggi*.";

export const DISKUSI = [
  {
    judul: "Sejalan dengan Ikhnaton et al. (2025)",
    isi: "yang tidak menemukan hubungan signifikan antara stres dan kebiasaan makan camilan manis. Banyak tugas belum tentu berarti banyak gula.",
  },
  {
    judul: "Gula terasa “dibutuhkan” saat nugas",
    isi: "Kebutuhan minuman manis saat mengerjakan tugas punya mean tertinggi (2,91; modus setuju), sesuai konsep self-medication with sucrose dan temuan Ruman & Undarwati (2026).",
  },
  {
    judul: "Merasa butuh ≠ sering mengonsumsi",
    isi: "Mahasiswi merasa lebih butuh gula, tetapi mahasiswa yang melaporkan konsumsi lebih sering. Kebutuhan yang dirasakan dan perilaku nyata tampak berbeda.",
  },
];

// --- 5. Limitasi & rekomendasi -----------------------------------------------
// Tiap limitasi dipasangkan dengan rekomendasinya

export const LIMITASI_REKOMENDASI = [
  {
    limitasi: {
      judul: "Komposisi responden belum proporsional",
      isi: "Didominasi perempuan (83,9%) dan angkatan 2025 (64,3%), sehingga belum mewakili mahasiswa S1 Psikologi UGM secara keseluruhan.",
    },
    rekomendasi: {
      judul: "Sampling yang lebih terkontrol",
      isi: "Quota atau stratified sampling berdasarkan angkatan dan jenis kelamin, dengan target jumlah yang proporsional.",
    },
  },
  {
    limitasi: {
      judul: "Data berupa laporan diri",
      isi: "Frekuensi konsumsi adalah perkiraan responden: rentan recall bias (terutama untuk UTS/UAS) dan social desirability bias.",
    },
    rekomendasi: {
      judul: "Pencatatan langsung",
      isi: "Food diary selama UTS/UAS dan pengambilan data segera setelah periode tersebut untuk meminimalkan recall bias.",
    },
  },
];
