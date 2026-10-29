export interface LikertOption {
  value: number;
  shortLabel: string;
  fullLabel: string;
  description: string;
}

export interface ScaleItem {
  id: string;
  code: string;
  dimension: string;
  text: string;
  contextHint?: string;
  isFavorable: boolean; // true = normal (1..4), false = reverse scored (4..1)
}

export interface QuantitativeTaskMetric {
  id: string;
  label: string;
  unit: string;
  helperText: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  benchmarks: {
    low: string;
    moderate: string;
    high: string;
  };
}

export interface ResearchMetadata {
  code: string;
  institution: string;
  faculty: string;
  university: string;
  title: string;
  subtitle: string;
  researcherName: string;
  researcherNIM: string;
  supervisorName: string;
  contactEmail: string;
  contactWhatsApp: string;
  estimatedMinutes: string;
  rewardInfo: string;
  rewardQuota: string;
  targetCriteria: string[];
  ethicsPoints: {
    title: string;
    description: string;
  }[];
}

export const RESEARCH_METADATA: ResearchMetadata = {
  code: "UGM-PSI // METPEN-KUANTITATIF-2026",
  institution: "Fakultas Psikologi",
  faculty: "Program Studi Sarjana Psikologi",
  university: "Universitas Gadjah Mada",
  title: "Jumlah Tugas Akademik dan Kecenderungan Perilaku Konsumsi Tinggi Gula pada Mahasiswa Psikologi UGM",
  subtitle:
    "Eksplorasi empiris mengenai bagaimana kepadatan beban tugas perkuliahan berinteraksi dengan pola konsumsi asupan manis harian di kalangan mahasiswa.",
  researcherName: "Nadia Arisanti Pramono",
  researcherNIM: "22/498142/PS/08912",
  supervisorName: "Dr. Restu Widaningrum, M.Psi., Psikolog",
  contactEmail: "nadia.arisanti@mail.ugm.ac.id",
  contactWhatsApp: "+62 812-3489-7710",
  estimatedMinutes: "5 - 7 Menit",
  rewardInfo: "Saldo GoPay / ShopeePay senilai total Rp 500.000",
  rewardQuota: "10 Responden Beruntung (Rp 50.000 / orang)",
  targetCriteria: [
    "Mahasiswa aktif Program Studi S1 Psikologi Universitas Gadjah Mada",
    "Sedang menempuh mata kuliah aktif pada semester berjalan",
    "Bersedia mengisi kuesioner secara jujur berdasarkan pengalaman 30 hari terakhir",
  ],
  ethicsPoints: [
    {
      title: "Kerahasiaan & Anonimitas Penuh",
      description:
        "Identitas personal serta nomor kontak undian dipisahkan secara otomatis dari lembar skoring utama. Data hanya diolah secara agregat untuk kepentingan akademik.",
    },
    {
      title: "Partisipasi Sukarela Tanpa Konsekuensi",
      description:
        "Tidak ada jawaban benar atau salah. Anda berhak menghentikan pengisian kapan saja tanpa dampak akademik apa pun.",
    },
    {
      title: "Penyimpanan Progres Otomatis",
      description:
        "Sistem menyimpan pilihan Anda secara lokal di peramban (browser). Jika koneksi terputus, Anda dapat melanjutkan dari bagian terakhir.",
    },
  ],
};

export const LIKERT_AGREEMENT_OPTIONS: LikertOption[] = [
  {
    value: 1,
    shortLabel: "STS",
    fullLabel: "Sangat Tidak Sesuai",
    description: "Sama sekali tidak menggambarkan kondisi saya",
  },
  {
    value: 2,
    shortLabel: "TS",
    fullLabel: "Tidak Sesuai",
    description: "Jarang atau kurang menggambarkan kondisi saya",
  },
  {
    value: 3,
    shortLabel: "S",
    fullLabel: "Sesuai",
    description: "Cukup sering atau menggambarkan kondisi saya",
  },
  {
    value: 4,
    shortLabel: "SS",
    fullLabel: "Sangat Sesuai",
    description: "Sangat akurat menggambarkan kondisi saya",
  },
];

export const LIKERT_FREQUENCY_OPTIONS: LikertOption[] = [
  {
    value: 1,
    shortLabel: "TP",
    fullLabel: "Tidak Pernah",
    description: "0 kali dalam sebulan terakhir",
  },
  {
    value: 2,
    shortLabel: "JR",
    fullLabel: "Jarang",
    description: "1 - 2 kali dalam seminggu",
  },
  {
    value: 3,
    shortLabel: "SR",
    fullLabel: "Sering",
    description: "3 - 5 kali dalam seminggu",
  },
  {
    value: 4,
    shortLabel: "SL",
    fullLabel: "Selalu",
    description: "Hampir setiap hari saat mengerjakan tugas",
  },
];

export const QUANTITATIVE_TASK_METRICS: QuantitativeTaskMetric[] = [
  {
    id: "weekly_assignments_count",
    label: "Berapa jumlah tugas akademik yang umumnya diberikan kepada Anda?",
    unit: "Tugas / Minggu",
    helperText:
      "Gabungan tugas individu, laporan praktikum, jurnal reading, maupun proyek kelompok yang memiliki tenggat waktu mingguan.",
    min: 1,
    max: 15,
    step: 1,
    defaultValue: 5,
    benchmarks: {
      low: "1 - 3 tugas (Ringan)",
      moderate: "4 - 7 tugas (Moderat)",
      high: "8+ tugas (Padat)",
    },
  },
  {
    id: "daily_study_hours",
    label:
      "Berapa lama durasi yang umumnya Anda butuhkan untuk mengerjakan tugas akademik di luar jam kuliah",
    unit: "Jam / Hari",
    helperText:
      "Waktu efektif yang Anda habiskan di meja belajar, perpustakaan, atau kafe untuk menyelesaikan tugas kuliah setiap harinya.",
    min: 1,
    max: 12,
    step: 1,
    defaultValue: 4,
    benchmarks: {
      low: "1 - 2 jam/hari",
      moderate: "3 - 5 jam/hari",
      high: "6+ jam/hari",
    },
  },
];

export const VARIABLE_X_ITEMS: ScaleItem[] = [
  {
    id: "vx_1",
    code: "X-01",
    dimension: "Kuantitas & Akumulasi Tugas",
    text: "Dalam satu minggu perkuliahan, saya sering menerima tugas baru padahal tugas dari mata kuliah lain belum selesai dikerjakan.",
    contextHint: "Akumulasi tenggat waktu (deadline) yang saling berhimpitan",
    isFavorable: true,
  },
  {
    id: "vx_2",
    code: "X-02",
    dimension: "Intensitas Kognitif",
    text: "Penyusunan laporan praktikum, analisis kasus, dan telaah jurnal di Psikologi UGM menyita sebagian besar waktu luang saya setiap pekan.",
    contextHint: "Beban kerja kognitif di luar tatap muka kelas",
    isFavorable: true,
  },
  {
    id: "vx_3",
    code: "X-03",
    dimension: "Keseimbangan Waktu",
    text: "Saya merasa durasi waktu yang diberikan dosen selalu sangat longgar sehingga saya dapat menyelesaikan seluruh tugas tanpa terburu-buru.",
    contextHint: "Butir Unfavorable — persepsi kelonggaran waktu",
    isFavorable: false,
  },
  {
    id: "vx_4",
    code: "X-04",
    dimension: "Koordinasi Kelompok",
    text: "Banyaknya penugasan berbasis kelompok membuat saya harus mengalokasikan waktu ekstra untuk diskusi dan penyelarasan draf hampir setiap hari.",
    contextHint: "Frekuensi kerja kolaboratif & rapat kelompok",
    isFavorable: true,
  },
  {
    id: "vx_5",
    code: "X-05",
    dimension: "Tekanan Tenggat Waktu",
    text: "Ketika mendekati tengah atau akhir semester, jumlah tagihan tugas akademik membuat waktu istirahat malam saya berkurang secara signifikan.",
    contextHint: "Dampak volume tugas terhadap jam pemulihan",
    isFavorable: true,
  },
  {
    id: "vx_6",
    code: "X-06",
    dimension: "Keterkelolaan Beban",
    text: "Jumlah tugas kuliah saya semester ini tergolong sedikit dan tidak pernah membuat saya merasa kelelahan mental.",
    contextHint: "Butir Unfavorable — persepsi beban minimal",
    isFavorable: false,
  },
  {
    id: "vx_7",
    code: "X-07",
    dimension: "Tuntutan Akademik Berlapis",
    text: "Dalam satu hari yang sama, saya kerap harus berpindah fokus mengerjakan lebih dari dua jenis tugas akademik yang berbeda.",
    contextHint: "Multitasking akademik harian",
    isFavorable: true,
  },
  {
    id: "vx_8",
    code: "X-08",
    dimension: "Kepadatan Mingguan",
    text: "Akhir pekan (Sabtu dan Minggu) tetap saya gunakan secara intensif untuk mencicil atau menuntaskan tugas perkuliahan.",
    contextHint: "Ekspansi waktu belajar ke akhir pekan",
    isFavorable: true,
  },
];

export const SWEET_CATEGORIES = [
  {
    id: "iced_coffee_palm_sugar",
    name: "Es Kopi Susu Gula Aren / Caramel Latte",
    examples: "Kopi kenangan, fore, janji jiwa, kafe sekitar kampus",
    sugarEstimate: "18 - 28g gula / cup",
  },
  {
    id: "boba_milk_tea",
    name: "Boba, Milk Tea, & Matcha Manis",
    examples: "Brown sugar boba, thai tea, cheese tea, minuman manis gerai",
    sugarEstimate: "26 - 38g gula / cup",
  },
  {
    id: "packaged_sweet_drinks",
    name: "Minuman Kemasan & Teh Manis Siap Minum",
    examples: "Teh botol/kotak, susu UHT rasa, minuman isotonik/soda di minimarket",
    sugarEstimate: "15 - 24g gula / botol",
  },
  {
    id: "bakery_dessert",
    name: "Roti Manis, Donat, Kue, & Es Krim",
    examples: "Donat, cromboloni, brownies, martabak manis, gelato",
    sugarEstimate: "20 - 35g gula / porsi",
  },
  {
    id: "chocolate_snacks",
    name: "Cokelat, Biskuit, & Camilan Manis Meja Belajar",
    examples: "Wafer cokelat, cookies, permen, sereal manis saat nugas",
    sugarEstimate: "14 - 22g gula / sajian",
  },
];

export const VARIABLE_Y_ITEMS: ScaleItem[] = [
  {
    id: "vy_1",
    code: "Y-01",
    dimension: "Pemicu Tugas (Task-Induced Craving)",
    text: "Saat menghadapi tugas kuliah yang rumit atau menumpuk, muncul dorongan kuat dalam diri saya untuk memesan atau membeli minuman manis.",
    contextHint: "Asosiasi langsung beban kognitif dengan keinginan manis",
    isFavorable: true,
  },
  {
    id: "vy_2",
    code: "Y-02",
    dimension: "Kompensasi Energi & Mood",
    text: "Mengonsumsi makanan atau minuman manis (seperti es kopi susu, boba, atau cokelat) membuat mood saya lebih stabil saat harus duduk lama mengerjakan tugas.",
    contextHint: "Regulasi afek melalui asupan glukosa",
    isFavorable: true,
  },
  {
    id: "vy_3",
    code: "Y-03",
    dimension: "Kendali Asupan",
    text: "Meskipun sedang lelah mengerjakan banyak tugas, saya tetap memilih air putih tawar dan tidak tertarik pada camilan maupun minuman berpemanis.",
    contextHint: "Butir Unfavorable — resistensi terhadap gula saat stres",
    isFavorable: false,
  },
  {
    id: "vy_4",
    code: "Y-04",
    dimension: "Self-Reward Akademik",
    text: "Setelah berhasil menyelesaikan satu tugas berat atau laporan praktikum, saya menghadiahi diri sendiri (self-reward) dengan makanan atau minuman tinggi gula.",
    contextHint: "Pola penguatan positif berbasis konsumsi manis",
    isFavorable: true,
  },
  {
    id: "vy_5",
    code: "Y-05",
    dimension: "Kebiasaan Meja Belajar",
    text: "Meja belajar saya hampir selalu ditemani setidaknya satu jenis minuman manis atau camilan manis ketika sedang mengejar tenggat waktu.",
    contextHint: "Ketersediaan konstan asupan manis saat belajar",
    isFavorable: true,
  },
  {
    id: "vy_6",
    code: "Y-06",
    dimension: "Eskalasi Porsi",
    text: "Pada minggu-minggu ketika jumlah tugas kuliah sangat padat, frekuensi saya membeli jajanan atau minuman manis meningkat dibanding minggu biasa.",
    contextHint: "Fluktuasi konsumsi seiring lonjakan beban tugas",
    isFavorable: true,
  },
  {
    id: "vy_7",
    code: "Y-07",
    dimension: "Kesadaran Batas Gula",
    text: "Saya selalu membatasi kadar gula (seperti memesan 'less sugar' atau tanpa gula sama sekali) walaupun sedang mengalami tekanan tugas yang tinggi.",
    contextHint: "Butir Unfavorable — kontrol kognitif atas konsumsi gula",
    isFavorable: false,
  },
  {
    id: "vy_8",
    code: "Y-08",
    dimension: "Konsumsi Larut Malam",
    text: "Ketika harus begadang mengerjakan tugas kuliah, saya cenderung mengonsumsi camilan manis atau minuman berpemanis agar tetap terjaga.",
    contextHint: "Konsumsi gula nokturnal saat pengerjaan tugas",
    isFavorable: true,
  },
];
