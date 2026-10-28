import React from "react";

interface HasilPenelitianProps {
  onOpenKuesioner: () => void;
  onBack: () => void;
}

// Plot frame on milimeter blok: 1 cell = 10 units, a bolder line every 5 cells
const X0 = 60;
const X1 = 400;
const Y0 = 20;
const Y1 = 260;

export const HasilPenelitian: React.FC<HasilPenelitianProps> = ({ onOpenKuesioner, onBack }) => {
  const cols = Array.from({ length: (X1 - X0) / 10 + 1 }, (_, i) => X0 + i * 10);
  const rows = Array.from({ length: (Y1 - Y0) / 10 + 1 }, (_, i) => Y0 + i * 10);

  return (
    <section className="hasil" aria-labelledby="hasilTitle">
      <div className="hasil-copy">
        <h1 className="hasil-title" id="hasilTitle">
          Hasil penelitian
        </h1>
        <p className="hasil-lede">
          Belum ada hasil yang bisa ditampilkan. Data masih dikumpulkan, dan
          ringkasannya akan muncul di halaman ini setelah kuesioner ditutup.
        </p>
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
            <span className="cta-label">Isi kuesioner</span>
            <span className="cta-sub">Jawabanmu ikut jadi titik di grafik ini</span>
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

      <figure className="hasil-chart" aria-hidden="true">
        <svg viewBox="0 0 420 320">
          {cols.map((x, i) => (
            <line key={`c${x}`} x1={x} y1={Y0} x2={x} y2={Y1} className={i % 5 ? "mm-minor" : "mm-major"} />
          ))}
          {rows.map((y, i) => (
            <line key={`r${y}`} x1={X0} y1={y} x2={X1} y2={y} className={(rows.length - 1 - i) % 5 ? "mm-minor" : "mm-major"} />
          ))}
          <path d={`M${X0} ${Y0 - 6}V${Y1}H${X1 + 6}`} className="plot-axis" />
          <text x={(X0 + X1) / 2} y={(Y0 + Y1) / 2 + 5} className="plot-empty">
            Belum ada data
          </text>
          <text x={X1} y={Y1 + 30} className="plot-label plot-label-x">
            Jumlah tugas kuliah
          </text>
          <text x={-Y0} y={X0 - 18} transform="rotate(-90)" className="plot-label plot-label-y">
            Konsumsi gula
          </text>
        </svg>
      </figure>
    </section>
  );
};
