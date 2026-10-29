import React, { useRef, useState } from "react";
import { soundEngine } from "../lib/soundEngine";
import {
  CONSENT_STATEMENT,
  CONSENT_TEXT,
  CONTACT,
  STUDY_DURATION,
  STUDY_GROUP,
  STUDY_TITLE,
} from "../data/studyInfo";
import { CubeMark } from "./CubeMark";
import { PaperLight } from "./PaperLight";

interface PersetujuanProps {
  agreed: boolean;
  isResuming: boolean;
  onToggle: (agreed: boolean) => void;
  onAgree: () => void;
  onDecline: () => void;
  onOpenPenjelasan: () => void;
}

// The informed consent, on its own page before the first question. The tick is
// saved with the draft, so going back or stopping halfway keeps it; the
// questions only open while the box is ticked.
export const Persetujuan: React.FC<PersetujuanProps> = ({
  agreed,
  isResuming,
  onToggle,
  onAgree,
  onDecline,
  onOpenPenjelasan,
}) => {
  const ticked = agreed;
  const [isMissing, setIsMissing] = useState(false);
  const boxRef = useRef<HTMLInputElement>(null);

  const start = () => {
    if (!ticked) {
      setIsMissing(true);
      boxRef.current?.focus();
      return;
    }
    onAgree();
  };

  return (
    <section className="paper persetujuan" aria-labelledby="persetujuanTitle">
      <PaperLight />

      <header className="paper-head">
        <p className="gate-kicker">
          <CubeMark className="gate-mark" />
          Sebelum mulai · Informed consent
        </p>
        <h1 className="paper-title" id="persetujuanTitle">
          Persetujuan <em className="is-pen">partisipasi</em>
        </h1>
        <p className="paper-sub">
          {isResuming
            ? "Anda sudah menyetujui ini, dan jawaban Anda masih tersimpan."
            : "Mohon dibaca sebentar sebelum mengisi kuesioner."}
        </p>
      </header>

      <div className="paper-ruled persetujuan-read">
        <section className="bab" aria-labelledby="setujuRingkas">
          <h2 className="bab-title" id="setujuRingkas">
            <span className="bab-num" aria-hidden="true">
              01
            </span>
            Ringkasan penelitian
          </h2>
          <dl className="bab-rows">
            <div>
              <dt>Peneliti</dt>
              <dd>{STUDY_GROUP}</dd>
            </div>
            <div>
              <dt>Topik</dt>
              <dd>{STUDY_TITLE}</dd>
            </div>
            <div>
              <dt>Tujuan</dt>
              <dd>Menganalisa kecenderungan konsumsi tinggi gula pada mahasiswa S1 Psikologi UGM</dd>
            </div>
            <div>
              <dt>Waktu</dt>
              <dd>{STUDY_DURATION}</dd>
            </div>
            <div>
              <dt>Kontak</dt>
              <dd>
                <a className="text-link" href={CONTACT.url} target="_blank" rel="noopener noreferrer">
                  {CONTACT.name} · {CONTACT.phone} (WhatsApp)
                </a>
              </dd>
            </div>
          </dl>
          <p>
            <a
              className="text-link"
              href="#/penjelasan"
              onClick={(e) => {
                e.preventDefault();
                onOpenPenjelasan();
              }}
            >
              Baca penjelasan penelitian lengkap
            </a>
          </p>
        </section>

        <section className="bab" aria-labelledby="setujuConsent">
          <h2 className="bab-title" id="setujuConsent">
            <span className="bab-num" aria-hidden="true">
              02
            </span>
            Informed consent
          </h2>
          <p>{CONSENT_TEXT}</p>
          <p>{CONSENT_STATEMENT}</p>
        </section>

        <div className="setuju-wrap">
          <label className={`setuju ${ticked ? "is-on" : ""} ${isMissing && !ticked ? "is-missing" : ""}`}>
            <input
              ref={boxRef}
              type="checkbox"
              className="setuju-input"
              checked={ticked}
              aria-describedby={isMissing && !ticked ? "setujuError" : undefined}
              onChange={(e) => {
                onToggle(e.target.checked);
                if (e.target.checked) {
                  setIsMissing(false);
                  soundEngine.playClockTick();
                }
              }}
            />
            <span className="setuju-box" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4.5 12.8 9.6 17.6 21.5 3.2" pathLength={1} />
              </svg>
            </span>
            <span className="setuju-text">Ya, saya bersedia berpartisipasi dalam penelitian ini.</span>
          </label>

          {isMissing && !ticked && (
            <p className="setuju-error" id="setujuError" role="alert">
              Tandai kotak persetujuan terlebih dahulu.
            </p>
          )}

          <div className="setuju-actions">
            <button type="button" className="cta" onClick={start}>
              <i className="cube-dot cta-cube" aria-hidden="true" />
              <span className="cta-label">{isResuming ? "Lanjut mengisi" : "Mulai mengisi"}</span>
              <span className="cta-sub">
                {isResuming
                  ? "Dari pertanyaan yang belum dijawab"
                  : "3 bagian singkat, jawaban tersimpan otomatis"}
              </span>
            </button>
            <button type="button" className="text-link" onClick={onDecline}>
              Saya tidak bersedia
            </button>
          </div>

          <p className="setuju-note">
            Jawaban baru terkirim saat Anda menekan “Kirim jawaban” di akhir kuesioner. Sebelum
            itu, Anda bisa berhenti kapan saja.
          </p>
        </div>
      </div>
    </section>
  );
};
