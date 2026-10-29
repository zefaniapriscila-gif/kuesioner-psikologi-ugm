// Questions word for word from the group's design doc (Kel9-KuantitatifD).
// Each answer is stored as its option number, 1 = first option ... 5 = last.

export interface Question {
  id: string;
  text: string;
  options: string[];
}

export const ANGKATAN = ["2023", "2024", "2025", "2026"];

const AGREEMENT = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"];
const WEEKLY_ROUTINE = ["0 kali", "1–3 kali", "4–7 kali", "7–13 kali", ">13 kali"];
const WEEKLY_COUNT = ["0 kali", "1–3 kali", "4–7 kali", "8–13 kali", ">13 kali"];

// Bagian tugas akademik
export const TASK_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Saya memiliki banyak tugas akademik yang harus diselesaikan.",
    options: AGREEMENT,
  },
  {
    id: "q2",
    text: "Dalam satu minggu perkuliahan, berapa jumlah tugas akademik yang umumnya diberikan kepada Anda?",
    options: ["0 tugas", "1–2 tugas", "3–4 tugas", "5–6 tugas", ">6 tugas"],
  },
  {
    id: "q3",
    text: "Berapa lama durasi yang umumnya Anda butuhkan untuk menyelesaikan tugas-tugas akademik?",
    options: ["<1 jam", "1–2 jam", "2–3 jam", "3–4 jam", ">4 jam"],
  },
];

// Bagian konsumsi tinggi gula
export const SUGAR_QUESTIONS: Question[] = [
  {
    id: "q4",
    text: "Dalam satu minggu, seberapa rutin Anda mengonsumsi makanan tinggi gula?",
    options: WEEKLY_ROUTINE,
  },
  {
    id: "q5",
    text: "Dalam satu minggu, seberapa rutin Anda mengonsumsi minuman tinggi gula?",
    options: WEEKLY_ROUTINE,
  },
  {
    id: "q6",
    text: "Saya membutuhkan makanan tinggi gula untuk mengerjakan tugas akademik.",
    options: AGREEMENT,
  },
  {
    id: "q7",
    text: "Saya membutuhkan minuman tinggi gula untuk mengerjakan tugas akademik.",
    options: AGREEMENT,
  },
  {
    id: "q8",
    text: "Dalam satu minggu, berapa kali Anda mengonsumsi makanan tinggi gula saat menghadapi tugas akademik?",
    options: WEEKLY_COUNT,
  },
  {
    id: "q9",
    text: "Dalam satu minggu, berapa kali Anda mengonsumsi minuman tinggi gula saat menghadapi tugas akademik?",
    options: WEEKLY_COUNT,
  },
  {
    id: "q10",
    text: "Dalam satu minggu, berapa kali Anda mengonsumsi makanan tinggi gula saat menghadapi tuntutan akademik berupa UTS dan/atau UAS?",
    options: WEEKLY_COUNT,
  },
  {
    id: "q11",
    text: "Dalam satu minggu, berapa kali Anda mengonsumsi minuman tinggi gula saat menghadapi tuntutan akademik berupa UTS dan/atau UAS?",
    options: WEEKLY_COUNT,
  },
];

export const ALL_QUESTIONS: Question[] = [...TASK_QUESTIONS, ...SUGAR_QUESTIONS];
