import React, { useEffect, useRef } from "react";
import { CONTACT, STUDY_DURATION } from "../data/studyInfo";
import { CubeMark } from "./CubeMark";
import { ArrowRight, ChatCircle } from "./Icons";
import { PaperLight } from "./PaperLight";

interface PenjelasanPenelitianProps {
  onOpenKuesioner: () => void;
  onBack: () => void;
}

const SEKILAS: [string, string][] = [
  ["Waktu", STUDY_DURATION],
  ["Sifat", "Sukarela, boleh mundur kapan saja"],
  ["Data", "Dianonimkan, hanya untuk kepentingan akademis"],
  ["Risiko", "Sangat minimal, topiknya netral"],
];

const PENGAMPU: [string, string[]][] = [
  ["Dosen pengampu", ["Samudera Fadlilla Jamaluddin, S.Psi., M.Sc.", "Satrio Priyo Adi, S.Psi., M.Sc."]],
  ["Asisten dosen", ["Leoni Nevia Yesha Ischuo S."]],
];

// In the order of the group's own list, with the names they go by
const TIM = [
  { name: "Aulia Rizkiana Rahmawati", call: "Aul", role: "narahubung" },
  { name: "Zefania Priscila", call: "Zef" },
  { name: "Kenzie Angelica Dewanta Putri", call: "Kenzie" },
  { name: "Fadhilah Ilmi", call: "Ilmi" },
  { name: "Nur Aziizah", call: "Zizi" },
  { name: "Shaufi Meditama", call: "Shaufi" },
];

// The study explained on a page of the gate's notebook, under the same light
export const PenjelasanPenelitian: React.FC<PenjelasanPenelitianProps> = ({
  onOpenKuesioner,
  onBack,
}) => {
  const markRef = useRef<HTMLElement>(null);

  // The highlighter goes over the aim once it scrolls into view
  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    if (!("IntersectionObserver" in window)) {
      mark.classList.add("is-on");
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        mark.classList.add("is-on");
        io.disconnect();
      },
      { rootMargin: "0px 0px -18% 0px" }
    );
    io.observe(mark);
    return () => io.disconnect();
  }, []);

  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenKuesioner();
  };

  const cta = (className: string) => (
    <a className={`cta ${className}`} href="#/kuesioner" onClick={start}>
      <i className="cube-dot cta-cube" aria-hidden="true" />
      <span className="cta-label">Mulai Penelitian</span>
      <span className="cta-sub">3–4 menit, anonim, ada undian Rp&nbsp;50.000</span>
    </a>
  );

  return (
    <section className="paper penjelasan" aria-labelledby="penjelasanTitle">
      <PaperLight />

      <header className="paper-head">
        <p className="gate-kicker">
          <CubeMark className="gate-mark" />
          Penjelasan penelitian
        </p>
        <h1 className="paper-title" id="penjelasanTitle">
          Jumlah <em className="is-pen">Tugas Akademik</em> dan Kecenderungan Perilaku{" "}
          <em className="is-tea">Konsumsi Tinggi Gula</em> pada Mahasiswa S1 Psikologi UGM
        </h1>
        <p className="paper-meta">
          Kelompok 9 · Metode Penelitian Kuantitatif kelas D · Psikologi UGM
        </p>
      </header>

      <aside className="penjelasan-aside" aria-labelledby="sekilasTitle">
        <div className="ringkas">
          <p className="ringkas-head" id="sekilasTitle">
            Sekilas
          </p>
          <dl className="ringkas-list">
            {SEKILAS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {cta("ringkas-cta")}
          <p className="ringkas-note">
            Sebelum pertanyaan pertama, Anda akan diminta membaca dan menyetujui informed
            consent.
          </p>
        </div>
      </aside>

      <div className="paper-ruled penjelasan-read">
        <section className="bab" aria-labelledby="babKenal">
          <h2 className="bab-title" id="babKenal">
            <span className="bab-num" aria-hidden="true">
              01
            </span>
            Perkenalan
          </h2>
          <p className="bab-intro">
            Perkenalkan, kami dari kelompok 9 yang beranggotakan Zef, Kenzie, Ilmi, Zizi, Aul,
            dan Shaufi dari mata kuliah Metode Penelitian Kuantitatif kelas D. Kami merupakan
            mahasiswa Psikologi UGM angkatan 2025 yang saat ini sedang melakukan survei dengan
            topik “Jumlah Tugas Akademik dan Kecenderungan Perilaku Konsumsi Tinggi Gula pada
            Mahasiswa S1 Psikologi UGM”.
          </p>
        </section>

        <section className="bab" aria-labelledby="babTujuan">
          <h2 className="bab-title" id="babTujuan">
            <span className="bab-num" aria-hidden="true">
              02
            </span>
            Tujuan
          </h2>
          <p className="bab-lead">
            Survei ini dilakukan untuk mengkaji{" "}
            <mark ref={markRef} className="stabilo">
              kecenderungan konsumsi tinggi gula
            </mark>{" "}
            pada mahasiswa S1 Psikologi UGM.
          </p>
          <p>
            Survei ini dimaksud untuk memenuhi tugas mata kuliah Metode Penelitian Kuantitatif
            dengan dosen pengampu dan asisten dosen berikut.
          </p>
          <dl className="bab-rows">
            {PENGAMPU.map(([role, names]) => (
              <div key={role}>
                <dt>{role}</dt>
                {names.map((n) => (
                  <dd key={n}>{n}</dd>
                ))}
              </div>
            ))}
          </dl>
        </section>

        <section className="bab" aria-labelledby="babTim">
          <h2 className="bab-title" id="babTim">
            <span className="bab-num" aria-hidden="true">
              03
            </span>
            Tim peneliti
          </h2>
          <ul className="roster">
            {TIM.map((p) => (
              <li key={p.name}>
                <span className="roster-name">{p.name}</span>
                <span className="roster-dots" aria-hidden="true" />
                <span className="roster-call">
                  <span className="visually-hidden">, dipanggil </span>
                  {p.call}
                  {p.role && <small> · {p.role}</small>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bab" aria-labelledby="babKontak">
          <h2 className="bab-title" id="babKontak">
            <span className="bab-num" aria-hidden="true">
              04
            </span>
            Kontak
          </h2>
          <p>
            Apabila terdapat pertanyaan atau informasi yang tidak dimengerti dalam survei ini,
            silakan menghubungi:
          </p>
          <a className="kontak" href={CONTACT.url} target="_blank" rel="noopener noreferrer">
            <ChatCircle size={22} className="kontak-icon" />
            <span className="kontak-text">
              <span className="kontak-label">Chat {CONTACT.name} di WhatsApp</span>
              <span className="kontak-num">{CONTACT.phone}</span>
            </span>
            <ArrowRight size={16} weight="bold" className="kontak-arrow" />
          </a>
        </section>

        <div className="penjelasan-end">
          {cta("penjelasan-end-cta")}
          <a
            className="text-link"
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            Kembali ke beranda
          </a>
        </div>
      </div>
    </section>
  );
};
