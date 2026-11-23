import React, { useCallback, useEffect, useRef, useState } from "react";
import { CubeMark } from "./CubeMark";
import { PENGAMPU, STUDY_GROUP, TIM } from "../data/studyInfo";
import {
  ALUR_TEORI,
  ANGKATAN_DOMINAN,
  CELAH,
  DISKUSI,
  DISKUSI_UTAMA,
  FAKTA_PEMBUKA,
  HASIL_GULA,
  HASIL_GULA_INTI,
  HASIL_TUGAS,
  HASIL_TUGAS_INTI,
  LIMITASI_REKOMENDASI,
  METODE,
  METODE_CATATAN,
  N_RESPONDEN,
  PERBANDINGAN,
  PERBANDINGAN_CATATAN,
  PRESENTASI_TANGGAL,
  RESPONDEN,
  TEORI_SOROTAN,
} from "../data/presentasiData";

interface PresentasiProps {
  onClose: () => void;
}

const SECTIONS = [
  { n: 1, label: "Pendahuluan" },
  { n: 2, label: "Metode" },
  { n: 3, label: "Hasil" },
  { n: 4, label: "Diskusi" },
  { n: 5, label: "Limitasi & rekomendasi" },
];

// Indonesian decimals
const dec = (v: number) => v.toFixed(2).replace(".", ",");
const pct = (n: number) => `${((n / N_RESPONDEN) * 100).toFixed(1).replace(".", ",")}%`;
// Position on a 1–5 score scale, as a share of the track
const onScale = (v: number) => `${Math.max(0, Math.min(1, (v - 1) / 4)) * 100}%`;
// Stagger index for the entrance animation
const at = (i: number) => ({ "--i": i }) as React.CSSProperties;

const GROUP_TONES = ["is-a", "is-b", "is-c"];

// ---------------------------------------------------------------------------

const Kicker: React.FC<{ section: number }> = ({ section }) => (
  <p className="sx-kicker rv" style={at(0)}>
    <span>{String(section).padStart(2, "0")}</span>
    {SECTIONS[section - 1].label}
  </p>
);

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="sx-title rv" style={at(1)}>
    {children}
  </h2>
);

const ScaleAxis: React.FC = () => (
  <div className="sx-axis" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} style={{ left: onScale(s) }}>
        {s}
      </span>
    ))}
  </div>
);

interface Slide {
  id: string;
  section: number; // 0 = cover / closing
  label: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    id: "judul",
    section: 0,
    label: "Judul",
    body: (
      <div className="sx-cover">
        <div className="sx-cover-cubes" aria-hidden="true">
          <CubeMark className="sx-cube c1" />
          <CubeMark className="sx-cube c2" />
          <CubeMark className="sx-cube c3" />
          <CubeMark className="sx-cube c4" />
          <CubeMark className="sx-cube c5" />
        </div>
        <p className="sx-pill rv" style={at(0)}>
          Presentasi hasil penelitian · Metode Penelitian Kuantitatif
        </p>
        <h1 className="sx-cover-title rv" style={at(1)}>
          Jumlah <span className="is-pen">Tugas Akademik</span> dan Kecenderungan Perilaku{" "}
          <span className="is-tea">Konsumsi Tinggi Gula</span> pada Mahasiswa S1 Psikologi UGM
        </h1>
        <div className="sx-cover-meta rv" style={at(2)}>
          <p>
            <strong>{STUDY_GROUP}</strong>
            {TIM.map((p) => p.call).join(" · ")}
          </p>
          <p>
            <strong>Fakultas Psikologi UGM</strong>
            {PRESENTASI_TANGGAL}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "latar",
    section: 1,
    label: "Latar belakang",
    body: (
      <>
        <Kicker section={1} />
        <Title>
          Tugas menumpuk, <em className="is-tea">yang manis</em> menemani
        </Title>
        <div className="sx-grid-3">
          {FAKTA_PEMBUKA.map((f, i) => (
            <article className="sx-fact rv" style={at(i + 2)} key={f.sumber}>
              <p className="sx-fact-num">{f.angka}</p>
              <p className="sx-fact-text">{f.isi}</p>
              <p className="sx-source">{f.sumber}</p>
            </article>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "teori",
    section: 1,
    label: "Landasan teori",
    body: (
      <>
        <Kicker section={1} />
        <Title>Dari tugas ke gula</Title>
        <ol className="sx-flow">
          {ALUR_TEORI.map((s, i) => (
            <li key={s.judul} className={`rv ${i === ALUR_TEORI.length - 1 ? "is-end" : ""}`} style={at(i + 2)}>
              <span className="sx-flow-dot">{i + 1}</span>
              <p className="sx-flow-title">{s.judul}</p>
              <p className="sx-flow-text">{s.isi}</p>
            </li>
          ))}
        </ol>
        <div className="sx-spot rv" style={at(6)}>
          <p className="sx-spot-num">{TEORI_SOROTAN.angka}</p>
          <p className="sx-spot-text">
            {TEORI_SOROTAN.isi}
            <span className="sx-source">{TEORI_SOROTAN.sumber}</span>
          </p>
        </div>
      </>
    ),
  },
  {
    id: "celah",
    section: 1,
    label: "Celah & tujuan",
    body: (
      <>
        <Kicker section={1} />
        <Title>Celah penelitian & tujuan</Title>
        <div className="sx-split">
          <ul className="sx-findings">
            {CELAH.temuan.map((t, i) => (
              <li key={t.sumber} className="rv" style={at(i + 2)}>
                <span className={`sx-mark ${t.signifikan ? "is-yes" : "is-no"}`}>
                  {t.signifikan ? "Berhubungan" : "Tidak signifikan"}
                </span>
                <span className="sx-finding-text">{t.teks}</span>
                <span className="sx-source">{t.sumber}</span>
              </li>
            ))}
          </ul>
          <div className="sx-stack">
            <p className="sx-lead rv" style={at(6)}>
              {CELAH.celah}
            </p>
            <div className="sx-goal rv" style={at(7)}>
              <p className="sx-label">Tujuan</p>
              <p>{CELAH.tujuan}</p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "desain",
    section: 2,
    label: "Desain penelitian",
    body: (
      <>
        <Kicker section={2} />
        <Title>
          Memotret, <em className="is-pen">bukan menguji</em>
        </Title>
        <div className="sx-grid-4">
          {METODE.map((m, i) => (
            <div className="sx-method rv" style={at(i + 2)} key={m.label}>
              <p className="sx-method-n">{String(i + 1).padStart(2, "0")}</p>
              <p className="sx-label">{m.label}</p>
              <p className="sx-method-text">{m.isi}</p>
            </div>
          ))}
        </div>
        <p className="sx-note rv" style={at(6)}>
          {METODE_CATATAN}
        </p>
      </>
    ),
  },
  {
    id: "responden",
    section: 2,
    label: "Profil responden",
    body: (
      <>
        <Kicker section={2} />
        <Title>Siapa yang mengisi?</Title>
        <div className="sx-resp">
          <div className="sx-resp-total rv" style={at(2)}>
            <p className="sx-huge">{N_RESPONDEN}</p>
            <p className="sx-resp-cap">responden mahasiswa S1 Psikologi UGM</p>
            <p className="sx-resp-extra">
              <strong>{ANGKATAN_DOMINAN.persen}</strong> {ANGKATAN_DOMINAN.label}
            </p>
          </div>
          <div className="sx-resp-bars">
            {RESPONDEN.map((g, gi) => (
              <div key={g.judul} className="rv" style={at(gi + 3)}>
                <p className="sx-label">{g.judul}</p>
                <div className="sx-stackbar">
                  {g.bagian.map((b, bi) => (
                    <span
                      key={b.label}
                      className={GROUP_TONES[bi]}
                      style={{ flexGrow: b.n }}
                      title={`${b.label}: ${b.n}`}
                    >
                      {b.n}
                    </span>
                  ))}
                </div>
                <p className="sx-legend">
                  {g.bagian.map((b, bi) => (
                    <span key={b.label}>
                      <i className={GROUP_TONES[bi]} />
                      {b.label} <b>{pct(b.n)}</b>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },
  {
    id: "hasil-tugas",
    section: 3,
    label: "Beban tugas",
    body: (
      <>
        <Kicker section={3} />
        <Title>
          Beban tugas: <em className="is-pen">tinggi</em>
        </Title>
        <div className="sx-grid-3">
          {HASIL_TUGAS.map((h, i) => (
            <article className="sx-stat rv" style={at(i + 2)} key={h.judul}>
              <p className="sx-label">{h.judul}</p>
              <p className="sx-stat-num">
                {h.angka}
                <span>{h.satuan}</span>
              </p>
              {i === 0 && (
                <div className="sx-meter" aria-hidden="true">
                  <i style={{ width: onScale(4.66) }} />
                </div>
              )}
              <p className="sx-stat-foot">{h.modus}</p>
            </article>
          ))}
        </div>
        <p className="sx-note rv" style={at(6)}>
          {HASIL_TUGAS_INTI}
        </p>
      </>
    ),
  },
  {
    id: "hasil-gula",
    section: 3,
    label: "Konsumsi gula",
    body: (
      <>
        <Kicker section={3} />
        <Title>
          Konsumsi gula: <em className="is-tea">rendah–sedang</em>
        </Title>
        <p className="sx-sub rv" style={at(2)}>
          {HASIL_GULA_INTI}
        </p>
        <div className="sx-bars rv" style={at(3)}>
          <div className="sx-bars-head">
            <span>Butir (mean, skala 1–5)</span>
            <ScaleAxis />
            <span>Modus</span>
          </div>
          {HASIL_GULA.map((g, i) => (
            <div className={`sx-bar-row ${g.sorot ? "is-hot" : ""}`} key={g.label}>
              <span className="sx-bar-label">{g.label}</span>
              <span className="sx-track">
                <i style={{ width: onScale(g.mean), animationDelay: `${350 + i * 60}ms` }} />
                <b style={{ left: onScale(g.mean) }}>{dec(g.mean)}</b>
              </span>
              <span className="sx-bar-mode">{g.modus}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "hasil-kelompok",
    section: 3,
    label: "Perbandingan kelompok",
    body: (
      <>
        <Kicker section={3} />
        <Title>Antarkelompok</Title>
        <div className="sx-grid-3 is-compare">
          {PERBANDINGAN.map((p, pi) => (
            <article className="sx-compare rv" style={at(pi + 2)} key={p.judul}>
              <p className="sx-compare-title">{p.judul}</p>
              <p className="sx-legend">
                {p.kelompok.map((k, ki) => (
                  <span key={k}>
                    <i className={GROUP_TONES[ki]} />
                    {k}
                  </span>
                ))}
              </p>
              {p.aspek.map((a) => (
                <div className="sx-pair" key={a.label}>
                  <p>{a.label}</p>
                  {a.nilai.map((v, vi) => (
                    <span className="sx-track is-thin" key={vi}>
                      <i className={GROUP_TONES[vi]} style={{ width: onScale(v) }} />
                      <b style={{ left: onScale(v) }}>{dec(v)}</b>
                    </span>
                  ))}
                </div>
              ))}
              <p className="sx-compare-text">{p.temuan}</p>
            </article>
          ))}
        </div>
        <p className="sx-note is-small rv" style={at(6)}>
          {PERBANDINGAN_CATATAN}
        </p>
      </>
    ),
  },
  {
    id: "diskusi",
    section: 4,
    label: "Diskusi",
    body: (
      <>
        <Kicker section={4} />
        <p className="sx-statement rv" style={at(1)}>
          {DISKUSI_UTAMA}
        </p>
        <div className="sx-grid-3">
          {DISKUSI.map((d, i) => (
            <article className="sx-card rv" style={at(i + 2)} key={d.judul}>
              <p className="sx-card-num">{String(i + 1).padStart(2, "0")}</p>
              <p className="sx-card-title">{d.judul}</p>
              <p className="sx-card-text">{d.isi}</p>
            </article>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "limitasi",
    section: 5,
    label: "Limitasi & rekomendasi",
    body: (
      <>
        <Kicker section={5} />
        <Title>Limitasi & rekomendasi</Title>
        <div className="sx-lr">
          <div className="sx-lr-head rv" style={at(2)}>
            <span className="is-tea">Limitasi</span>
            <span />
            <span className="is-pen">Rekomendasi</span>
          </div>
          {LIMITASI_REKOMENDASI.map((p, i) => (
            <div className="sx-lr-row rv" style={at(i + 3)} key={p.limitasi.judul}>
              <article className="sx-lr-card is-lim">
                <p className="sx-card-title">{p.limitasi.judul}</p>
                <p className="sx-card-text">{p.limitasi.isi}</p>
              </article>
              <span className="sx-lr-arrow" aria-hidden="true">
                →
              </span>
              <article className="sx-lr-card is-rec">
                <p className="sx-card-title">{p.rekomendasi.judul}</p>
                <p className="sx-card-text">{p.rekomendasi.isi}</p>
              </article>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "penutup",
    section: 0,
    label: "Penutup",
    body: (
      <div className="sx-cover is-end">
        <div className="sx-cover-cubes" aria-hidden="true">
          <CubeMark className="sx-cube c1" />
          <CubeMark className="sx-cube c3" />
          <CubeMark className="sx-cube c5" />
        </div>
        <p className="sx-pill rv" style={at(0)}>
          Terima kasih
        </p>
        <h1 className="sx-cover-title is-big rv" style={at(1)}>
          Ada <span className="is-tea">pertanyaan</span>?
        </h1>
        <div className="sx-cover-meta rv" style={at(2)}>
          <p>
            <strong>Tim peneliti</strong>
            {TIM.map((p) => p.name).join(", ")}
          </p>
          {PENGAMPU.map(([role, names]) => (
            <p key={role}>
              <strong>{role}</strong>
              {names.join(", ")}
            </p>
          ))}
        </div>
      </div>
    ),
  },
];

// ---------------------------------------------------------------------------

const COUNT = SLIDES.length;

const indexFromHash = () => {
  const m = window.location.hash.match(/^#\/presentasi\/(\d+)/);
  const i = m ? Number(m[1]) - 1 : 0;
  return Math.min(Math.max(0, i), COUNT - 1);
};

export const Presentasi: React.FC<PresentasiProps> = ({ onClose }) => {
  const [index, setIndex] = useState(indexFromHash);
  const [dir, setDir] = useState<1 | -1>(1);
  const [isFull, setIsFull] = useState(false);
  const [idle, setIdle] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (next: number) => {
      const i = Math.min(Math.max(0, next), COUNT - 1);
      if (i === index) return;
      setDir(i > index ? 1 : -1);
      setIndex(i);
    },
    [index]
  );

  // Keep the slide in the link, so a refresh or a shared link opens the same one
  useEffect(() => {
    window.history.replaceState(null, "", `#/presentasi/${index + 1}`);
  }, [index]);

  // The deck covers the page; the page underneath should not scroll
  useEffect(() => {
    const root = document.documentElement;
    const prev = [root.style.overflow, root.style.scrollbarGutter];
    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "auto";
    return () => {
      [root.style.overflow, root.style.scrollbarGutter] = prev;
    };
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else deckRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(index - 1);
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(COUNT - 1);
          break;
        case "f":
        case "F":
          toggleFull();
          break;
        case "Escape":
          if (!document.fullscreenElement) onClose();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, toggleFull, onClose]);

  // In full screen the controls step aside until the mouse moves
  useEffect(() => {
    if (!isFull) {
      setIdle(false);
      return;
    }
    let timer = window.setTimeout(() => setIdle(true), 2500);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 2500);
    };
    window.addEventListener("mousemove", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", wake);
    };
  }, [isFull]);

  const slide = SLIDES[index];
  const firstOf = (section: number) => SLIDES.findIndex((s) => s.section === section);

  return (
    <div
      ref={deckRef}
      data-theme="night"
      className={`deck ${idle ? "is-idle" : ""} ${isFull ? "is-full" : ""}`}
      role="region"
      aria-roledescription="presentasi"
      aria-label="Presentasi hasil penelitian"
      onTouchStart={(e) => {
        const p = e.touches[0];
        touch.current = { x: p.clientX, y: p.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const p = e.changedTouches[0];
        const dx = p.clientX - start.x;
        const dy = p.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="deck-viewport">
        <article
          className="deck-stage"
          aria-roledescription="slide"
          aria-label={`Slide ${index + 1} dari ${COUNT}: ${slide.label}`}
        >
          <div className="deck-progress" aria-hidden="true">
            <i style={{ width: `${((index + 1) / COUNT) * 100}%` }} />
          </div>
          <div key={slide.id} className={`deck-slide sx-${slide.id} ${dir > 0 ? "from-right" : "from-left"}`}>
            {slide.body}
          </div>
          <footer className="deck-foot" aria-hidden="true">
            <span>
              <CubeMark className="deck-foot-mark" />
              Takaran · {STUDY_GROUP}
            </span>
            <span>
              {String(index + 1).padStart(2, "0")} / {String(COUNT).padStart(2, "0")}
            </span>
          </footer>
        </article>
      </div>

      <nav className="deck-bar" aria-label="Kontrol presentasi">
        <button type="button" className="deck-btn" onClick={onClose} aria-label="Tutup presentasi" title="Tutup (Esc)">
          <svg viewBox="0 0 256 256" aria-hidden="true">
            <path d="M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128 47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z" />
          </svg>
        </button>

        <ol className="deck-sections">
          {SECTIONS.map((s) => {
            const active = slide.section === s.n;
            return (
              <li key={s.n}>
                <button
                  type="button"
                  className={`deck-sec ${active ? "is-active" : ""}`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => go(firstOf(s.n))}
                >
                  <span className="deck-sec-n">{s.n}</span>
                  <span className="deck-sec-label">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="deck-nav">
          <span className="deck-count" aria-live="polite">
            {index + 1} / {COUNT}
          </span>
          <button
            type="button"
            className="deck-btn"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Slide sebelumnya"
          >
            <svg viewBox="0 0 256 256" aria-hidden="true">
              <path d="M168.49 199.51a12 12 0 0 1-17 17l-80-80a12 12 0 0 1 0-17l80-80a12 12 0 0 1 17 17L97 128Z" />
            </svg>
          </button>
          <button
            type="button"
            className="deck-btn is-primary"
            onClick={() => go(index + 1)}
            disabled={index === COUNT - 1}
            aria-label="Slide berikutnya"
          >
            <svg viewBox="0 0 256 256" aria-hidden="true">
              <path d="m184.49 136.49-80 80a12 12 0 0 1-17-17L159 128 87.51 56.49a12 12 0 1 1 17-17l80 80a12 12 0 0 1-.02 17Z" />
            </svg>
          </button>
          <button
            type="button"
            className="deck-btn is-fs"
            onClick={toggleFull}
            aria-label={isFull ? "Keluar dari layar penuh" : "Layar penuh"}
            title="Layar penuh (F)"
          >
            <svg viewBox="0 0 256 256" aria-hidden="true">
              {isFull ? (
                <path d="M100 40v48a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h36V40a12 12 0 0 1 24 0Zm116 36h-36V40a12 12 0 0 0-24 0v48a12 12 0 0 0 12 12h48a12 12 0 0 0 0-24ZM88 156H40a12 12 0 0 0 0 24h36v36a12 12 0 0 0 24 0v-48a12 12 0 0 0-12-12Zm128 0h-48a12 12 0 0 0-12 12v48a12 12 0 0 0 24 0v-36h36a12 12 0 0 0 0-24Z" />
              ) : (
                <path d="M220 48v48a12 12 0 0 1-24 0V60h-36a12 12 0 0 1 0-24h48a12 12 0 0 1 12 12ZM96 196H60v-36a12 12 0 0 0-24 0v48a12 12 0 0 0 12 12h48a12 12 0 0 0 0-24Zm112-48a12 12 0 0 0-12 12v36h-36a12 12 0 0 0 0 24h48a12 12 0 0 0 12-12v-48a12 12 0 0 0-12-12ZM96 36H48a12 12 0 0 0-12 12v48a12 12 0 0 0 24 0V60h36a12 12 0 0 0 0-24Z" />
              )}
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
};
