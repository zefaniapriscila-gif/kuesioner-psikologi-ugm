import React, { useEffect, useRef, useState } from "react";
import { soundEngine } from "../lib/soundEngine";
import { CubeMark } from "./CubeMark";
import { PaperLight } from "./PaperLight";

const CODE_LENGTH = 4;

interface KodePartisipasiProps {
  code: string;
  onChange: (code: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

const toSlots = (value: string): string[] => {
  const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, CODE_LENGTH);
  return Array.from({ length: CODE_LENGTH }, (_, i) => clean[i] ?? "");
};

// Participation code step shown before informed consent.
// Any 4-character code is accepted and carried through to the spreadsheet.
export const KodePartisipasi: React.FC<KodePartisipasiProps> = ({
  code,
  onChange,
  onContinue,
  onBack,
}) => {
  const [slots, setSlots] = useState<string[]>(() => toSlots(code));
  const [isMissing, setIsMissing] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const incoming = toSlots(code);
    setSlots((prev) => (prev.join("") === incoming.join("") ? prev : incoming));
  }, [code]);

  useEffect(() => {
    const firstEmpty = slots.findIndex((c) => !c);
    const target = firstEmpty === -1 ? CODE_LENGTH - 1 : firstEmpty;
    inputRefs.current[target]?.focus({ preventScroll: true });
    // Focus once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (next: string[]) => {
    setSlots(next);
    const joined = next.join("");
    onChange(joined);
    if (next.every((c) => c.length === 1)) {
      setIsMissing(false);
    }
  };

  const handleInputChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const next = [...slots];

    if (!cleaned) {
      next[index] = "";
      commit(next);
      return;
    }

    if (cleaned.length === 1 || (cleaned.length === 2 && slots[index])) {
      const char =
        cleaned.length === 1
          ? cleaned
          : cleaned.startsWith(slots[index])
            ? cleaned[1]
            : cleaned[0];
      next[index] = char;
      commit(next);
      soundEngine.playClockTick();
      if (index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Multi-character input (autofill, paste via change, or fast IME entry)
    const start = cleaned.length >= CODE_LENGTH && index === 0 ? 0 : index;
    const chars = cleaned.slice(0, CODE_LENGTH - start).split("");
    chars.forEach((ch, offset) => {
      next[start + offset] = ch;
    });
    commit(next);
    soundEngine.playClockTick();
    const nextFocus = Math.min(CODE_LENGTH - 1, start + chars.length);
    inputRefs.current[nextFocus]?.focus();
  };

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!pasted) return;

    const next = [...slots];
    const start = pasted.length >= CODE_LENGTH ? 0 : index;
    pasted
      .slice(0, CODE_LENGTH - start)
      .split("")
      .forEach((ch, offset) => {
        next[start + offset] = ch;
      });
    commit(next);
    soundEngine.playClockTick();
    const nextFocus = Math.min(CODE_LENGTH - 1, start + pasted.length);
    inputRefs.current[nextFocus]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (slots[index]) {
        const next = [...slots];
        next[index] = "";
        commit(next);
        e.preventDefault();
      } else if (index > 0) {
        const next = [...slots];
        next[index - 1] = "";
        commit(next);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstEmpty = slots.findIndex((c) => !c);
    if (firstEmpty !== -1) {
      setIsMissing(true);
      inputRefs.current[firstEmpty]?.focus();
      return;
    }
    onContinue();
  };

  const isComplete = slots.every((c) => c.length === 1);

  return (
    <section className="paper kode-page" aria-labelledby="kodeTitle">
      <PaperLight />

      <header className="paper-head">
        <p className="gate-kicker">
          <CubeMark className="gate-mark" />
          Sebelum mulai · Kode partisipasi
        </p>
        <h1 className="paper-title" id="kodeTitle">
          Masukkan <em className="is-pen">kode partisipasi</em> Anda
        </h1>
        <p className="paper-sub">
          Ketik 4 karakter kode partisipasi sebelum lanjut ke lembar persetujuan.
        </p>
      </header>

      <div className="paper-ruled">
        <form className="kode-form" onSubmit={handleSubmit} noValidate>
          <section className="bab" aria-labelledby="kodeLabel">
            <h2 className="bab-title" id="kodeLabel">
              <span className="bab-num" aria-hidden="true">
                01
              </span>
              Kode partisipasi
            </h2>

            <div
              className="kode-boxes"
              role="group"
              aria-labelledby="kodeLabel"
            >
              {slots.map((char, idx) => {
                const boxMissing = isMissing && !char;
                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label={`Karakter kode ke-${idx + 1} dari ${CODE_LENGTH}`}
                    aria-invalid={boxMissing}
                    aria-describedby={isMissing && !isComplete ? "kodeError" : undefined}
                    className={`kode-box ${char ? "is-filled" : ""} ${boxMissing ? "is-missing" : ""}`}
                    value={char}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    onPaste={(e) => handlePaste(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                  />
                );
              })}
            </div>

            {isMissing && !isComplete && (
              <p className="setuju-error" id="kodeError" role="alert">
                Lengkapi ke-4 kotak kode partisipasi terlebih dahulu.
              </p>
            )}
          </section>

          <div className="setuju-actions">
            <button type="submit" className="cta">
              <i className="cube-dot cta-cube" aria-hidden="true" />
              <span className="cta-label">Lanjut ke persetujuan</span>
              <span className="cta-sub">Kode akan tercatat bersama jawaban Anda</span>
            </button>
            <button type="button" className="text-link" onClick={onBack}>
              Kembali ke beranda
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
