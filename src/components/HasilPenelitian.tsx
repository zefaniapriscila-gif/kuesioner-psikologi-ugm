import React, { useEffect, useMemo, useRef, useState } from "react";
import { PaperLight } from "./PaperLight";
import {
  computeStats,
  fetchResultPoints,
  loadMyPoint,
  ResultPoint,
  resultsUrl,
} from "../lib/resultsFeed";

interface HasilPenelitianProps {
  onOpenKuesioner: () => void;
  onBack: () => void;
}

const POLL_MS = 20000;

// Plot on milimeter blok: 1 cell = 10 units, one score step = 6 cells,
// the bolder lines fall on the scores 1..5
const UNIT = 60;
const X0 = 60;
const X1 = X0 + 5 * UNIT;
const Y0 = 20;
const Y1 = Y0 + 5 * UNIT;
const px = (score: number) => X0 + (score - 0.5) * UNIT;
const py = (score: number) => Y1 - (score - 0.5) * UNIT;
const SCORES = [1, 2, 3, 4, 5];

// Means of 1..5 options land on a coarse lattice; a small fixed nudge per
// point keeps respondents with the same answers from hiding each other
const nudge = (i: number, axis: number) => {
  const h = Math.sin((i + 1) * (axis ? 78.233 : 12.9898)) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 0.16;
};

// A sugar cube drawn in ink, lit from the window: bright top, shaded right face
const SugarCube: React.FC<{ x: number; y: number; mine?: boolean; delay: number; label: string }> = ({
  x,
  y,
  mine,
  delay,
  label,
}) => (
  <g
    className={`cube-pt ${delay >= 0 ? "is-new" : ""} ${mine ? "is-mine" : ""}`}
    transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
    style={delay >= 0 ? { animationDelay: `${delay}ms` } : undefined}
  >
    <title>{label}</title>
    <ellipse className="cube-shadow" cx="3.2" cy="7.4" rx="7.6" ry="2.6" />
    <g className="cube-body">
      <path className="cube-left" d="M-6.1 -3.5 L0 0 L0 7 L-6.1 3.5 Z" />
      <path className="cube-right" d="M0 0 L6.1 -3.5 L6.1 3.5 L0 7 Z" />
      <path className="cube-top" d="M0 -7 L6.1 -3.5 L0 0 L-6.1 -3.5 Z" />
      <path className="cube-edge" d="M0 -7 L6.1 -3.5 L6.1 3.5 L0 7 L-6.1 3.5 L-6.1 -3.5 Z M0 0 L0 7 M0 0 L6.1 -3.5 M0 0 L-6.1 -3.5" />
    </g>
  </g>
);

const describe = (r: number | null, n: number): string => {
  if (n === 0) return "Belum ada jawaban yang masuk. Titik pertama akan muncul di sini begitu ada yang mengisi.";
  if (r == null) return `Baru ${n} jawaban masuk. Garis kecenderungan muncul setelah ada minimal 3 jawaban yang berbeda.`;
  const a = Math.abs(r);
  const strength = a < 0.1 ? null : a < 0.3 ? "lemah" : a < 0.5 ? "sedang" : "kuat";
  const caveat = n < 30 ? " Datanya masih sedikit, jadi gambaran ini masih bisa berubah." : "";
  if (!strength) return `Sejauh ini belum terlihat hubungan antara jumlah tugas dan konsumsi gula.${caveat}`;
  const way =
    r > 0
      ? "makin banyak tugas akademik, konsumsi tinggi gula cenderung makin tinggi"
      : "makin banyak tugas akademik, konsumsi tinggi gula justru cenderung makin rendah";
  return `Ada kecenderungan ${strength}: ${way}.${caveat}`;
};

const agoText = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  return `${Math.round(s / 60)} menit lalu`;
};

// Local preview without a deployed script: a made-up cloud, dev server only
const demoPoints = (): ResultPoint[] =>
  Array.from({ length: 46 }, (_, i) => {
    const task = Math.min(5, Math.max(1, 1.4 + ((i * 37) % 100) / 28));
    const noise = (((i * 53) % 100) / 100 - 0.5) * 1.9;
    return { task, sugar: Math.min(5, Math.max(1, 0.9 + task * 0.55 + noise)) };
  });

export const HasilPenelitian: React.FC<HasilPenelitianProps> = ({ onOpenKuesioner, onBack }) => {
  const [points, setPoints] = useState<ResultPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef(0);
  const myPoint = useMemo(loadMyPoint, []);

  useEffect(() => {
    const url = resultsUrl();
    const demo = import.meta.env.DEV && new URLSearchParams(window.location.search).has("demo");
    if (demo) {
      setPoints(demoPoints());
      setUpdatedAt(Date.now());
      return;
    }
    if (!url) {
      setFailed(true);
      return;
    }

    let ctrl: AbortController | null = null;
    let timer = 0;
    const load = async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try {
        const next = await fetchResultPoints(url, ctrl.signal);
        setPoints(next);
        setFailed(false);
        setUpdatedAt(Date.now());
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      }
    };
    const schedule = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") load();
      }, POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load();
        schedule();
      }
    };

    load();
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ctrl?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  const stats = useMemo(() => computeStats(points ?? []), [points]);

  // Cubes already on the page stay put; only new arrivals drop in
  const firstNew = seen.current;
  useEffect(() => {
    if (points) seen.current = points.length;
  }, [points]);

  const line = useMemo(() => {
    if (stats.slope == null || stats.intercept == null || !points?.length) return null;
    const xs = points.map((p) => p.task);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const at = (x: number) => stats.slope! * x + stats.intercept!;
    // Keep the line inside the paper
    const clampX = (x: number) => {
      const y = at(x);
      if (y > 5.5) return (5.5 - stats.intercept!) / stats.slope!;
      if (y < 0.5) return (0.5 - stats.intercept!) / stats.slope!;
      return x;
    };
    const a = clampX(lo);
    const b = clampX(hi);
    return { x1: px(a), y1: py(at(a)), x2: px(b), y2: py(at(b)) };
  }, [stats, points]);

  const cols = Array.from({ length: (X1 - X0) / 10 + 1 }, (_, i) => X0 + i * 10);
  const rows = Array.from({ length: (Y1 - Y0) / 10 + 1 }, (_, i) => Y0 + i * 10);
  const isMajor = (offset: number) => (offset - UNIT / 2) % UNIT === 0;

  const n = points?.length ?? 0;
  const loading = points == null && !failed;

  return (
    <section className="hasil" aria-labelledby="hasilTitle">
      <PaperLight />
      <div className="hasil-copy">
        <p className="hasil-live" aria-live="polite">
          <i className={`live-dot ${failed ? "is-off" : ""}`} aria-hidden="true" />
          {failed
            ? "Data belum bisa dimuat"
            : loading
            ? "Memuat data…"
            : `Langsung dari spreadsheet · diperbarui ${agoText(now - updatedAt)}`}
        </p>
        <h1 className="hasil-title" id="hasilTitle">
          Hasil penelitian
        </h1>
        <p className="hasil-lede">
          {failed
            ? "Grafik akan terisi otomatis begitu data dari spreadsheet bisa dibaca."
            : loading
            ? "Sebentar, sedang mengambil jawaban terbaru."
            : describe(stats.r, n)}
        </p>

        {!failed && !loading && (
          <dl className="hasil-stats">
            <div>
              <dt>Responden</dt>
              <dd>{n}</dd>
            </div>
            <div>
              <dt>Korelasi r</dt>
              <dd>{stats.r == null ? "–" : stats.r.toFixed(2).replace(".", ",")}</dd>
            </div>
          </dl>
        )}

        <div className="hasil-actions">
          <a
            className="cta"
            href="#/kuesioner"
            onClick={(e) => {
              e.preventDefault();
              onOpenKuesioner();
            }}
          >
            <i className="cube-dot cta-cube" aria-hidden="true" />
            <span className="cta-label">{myPoint ? "Isi lagi" : "Isi kuesioner"}</span>
            <span className="cta-sub">
              {myPoint ? "Kubus bertanda adalah jawabanmu" : "Jawabanmu ikut jadi satu kubus di grafik ini"}
            </span>
          </a>
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

      <figure className="hasil-chart">
        <svg
          viewBox={`0 0 ${X1 + 30} ${Y1 + 56}`}
          role="img"
          aria-label={`Grafik sebar ${n} responden: skor tugas akademik terhadap skor konsumsi tinggi gula`}
        >
          {cols.map((x) => (
            <line key={`c${x}`} x1={x} y1={Y0} x2={x} y2={Y1} className={isMajor(x - X0) ? "mm-major" : "mm-minor"} />
          ))}
          {rows.map((y) => (
            <line key={`r${y}`} x1={X0} y1={y} x2={X1} y2={y} className={isMajor(Y1 - y) ? "mm-major" : "mm-minor"} />
          ))}
          <path d={`M${X0} ${Y0 - 6}V${Y1}H${X1 + 6}`} className="plot-axis" />

          {SCORES.map((s) => (
            <g key={s}>
              <text x={px(s)} y={Y1 + 18} className="plot-tick">
                {s}
              </text>
              <text x={X0 - 12} y={py(s) + 4} className="plot-tick plot-tick-y">
                {s}
              </text>
            </g>
          ))}

          {line && (
            <line
              key={`${n}`}
              className="plot-trend"
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              pathLength={1}
            />
          )}

          {points?.map((p, i) => (
            <SugarCube
              key={i}
              x={px(Math.min(5.4, Math.max(0.6, p.task + nudge(i, 0))))}
              y={py(Math.min(5.4, Math.max(0.6, p.sugar + nudge(i, 1))))}
              delay={i >= firstNew ? Math.min(900, (i - firstNew) * 22) : -1}
              label={`Tugas ${p.task.toFixed(1)}, gula ${p.sugar.toFixed(1)}`}
            />
          ))}

          {myPoint && points && (
            <g className="plot-mine" transform={`translate(${px(myPoint.task)} ${py(myPoint.sugar)})`}>
              <circle r="13" />
              <text x="17" y="-10">
                kamu
              </text>
            </g>
          )}

          {n === 0 && !loading && (
            <text x={(X0 + X1) / 2} y={(Y0 + Y1) / 2 + 5} className="plot-empty">
              Belum ada data
            </text>
          )}

          <text x={X1} y={Y1 + 44} className="plot-label plot-label-x">
            Jumlah tugas akademik →
          </text>
          <text x={-Y0} y={X0 - 30} transform="rotate(-90)" className="plot-label plot-label-y">
            Konsumsi tinggi gula →
          </text>
        </svg>
        <figcaption className="hasil-caption">
          Satu kubus = satu responden. Skor = rata-rata jawaban 1–5, tugas dari Q1–Q3 dan gula
          dari Q4–Q11.
        </figcaption>
      </figure>
    </section>
  );
};
