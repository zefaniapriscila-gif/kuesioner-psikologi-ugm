import React, { useEffect, useRef, useState } from "react";
import { soundEngine } from "../lib/soundEngine";
import { CAPTION, createGlassScene, GlassScene, Slot } from "../lib/glassScene";

interface BerandaProps {
  isNightMode: boolean;
  playIntro: boolean;
  resumePercent: number;
  onIntroEnd: () => void;
  onOpenKuesioner: () => void;
  onOpenHasil: () => void;
}

// Every task that comes in drops one sugar cube into the glass
const TASKS = [
  { tag: "Deadline 23.59", title: "Laporan praktikum" },
  { tag: "Besok pagi", title: "Review 15 jurnal" },
  { tag: "Belum selesai", title: "Olah data SPSS" },
  { tag: "34 halaman", title: "Makalah kelompok" },
  { tag: "18 slide", title: "Presentasi kelompok" },
  { tag: "Kumpul hari ini", title: "Resume kuliah" },
];

// The headline, one stacked line each on wide screens
const TITLE: [string, string][] = [
  ["Tugas", "numpuk,"],
  ["gula ikut", "numpuk?"],
];

const INTRO_START = 450;
const INTRO_GAP = 430;
const SLIP_MS = 1000;
const GLIDE_MS = 950;
const INTRO_END = INTRO_START + (TASKS.length - 1) * INTRO_GAP + SLIP_MS + 700;
const WIDE = 1000; // from here up the glass stands between the copy and the actions

export const Beranda: React.FC<BerandaProps> = ({
  isNightMode,
  playIntro,
  resumePercent,
  onIntroEnd,
  onOpenKuesioner,
  onOpenHasil,
}) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slipsRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GlassScene | null>(null);
  const nightRef = useRef(isNightMode);
  nightRef.current = isNightMode;

  const [phase, setPhase] = useState<"intro" | "home">(() =>
    playIntro && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "intro" : "home"
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [landed, setLanded] = useState(0);
  const [canHover] = useState(() => window.matchMedia("(hover: hover)").matches);

  // ---------------------------------------------------------------------------
  // The glass: on wide screens it never moves, it stands in the middle of the
  // desk the whole time. Stacked, it plays the intro large and centred, then
  // settles between the copy and the actions.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const host = heroRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const measure = () => {
      const home = homeRef.current;
      if (!home) return null;
      const hr = host.getBoundingClientRect();
      const r = home.getBoundingClientRect();
      const slot: Slot = { x: r.left - hr.left, y: r.top - hr.top, w: r.width, h: r.height };
      if (hr.width >= WIDE) {
        // The slot ends at the desk edge; its caption hangs below on the desk
        const onDesk = { ...slot, h: slot.h + CAPTION };
        return { intro: onDesk, home: onDesk };
      }
      const vh = window.innerHeight;
      const h = Math.min(vh * 0.68, 600);
      return {
        intro: { x: 0, y: Math.max(24, (vh - h) / 2 + 20), w: hr.width, h },
        home: slot,
      };
    };

    const scene = createGlassScene({
      host,
      canvas,
      measure,
      follower: captionRef.current,
      night: nightRef.current,
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onSplash: () => soundEngine.playSugarDrop(),
    });
    sceneRef.current = scene;
    if (phaseRef.current === "home") {
      scene.settle();
      scene.jumpHome();
    }
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setNight(isNightMode);
  }, [isNightMode]);

  // Nothing behind the intro can be reached until it is over
  useEffect(() => {
    if (gridRef.current) gridRef.current.inert = phase === "intro";
  }, [phase]);

  // ---------------------------------------------------------------------------
  // Intro: each task slip falls into the glass and lands as a sugar cube
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== "intro") return;
    const scene = sceneRef.current;
    const layer = slipsRef.current;
    if (!scene || !layer) return;

    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    setLanded(0);

    TASKS.forEach((task, i) => {
      later(() => {
        const v = scene.view();
        layer.style.setProperty("--u", `${Math.round(v.u)}px`);
        const slip = document.createElement("div");
        slip.className = "slip";
        const paper = document.createElement("div");
        paper.className = "slip-paper";
        const tag = document.createElement("span");
        tag.className = "slip-tag";
        tag.textContent = task.tag;
        const title = document.createElement("span");
        title.className = "slip-title";
        title.textContent = task.title;
        paper.append(tag, title);
        slip.append(paper);
        layer.appendChild(slip);

        // Hang the slip beside where its cube will land, on the other side
        // from the slip before it so the two never cover each other, then
        // let it drop into the glass
        const px = scene.pileX(i);
        const side = i % 2 ? 1 : -1;
        const x0 = v.cx + Math.max(-0.37, Math.min(0.37, px + side * 0.19)) * v.u;
        const x1 = v.cx + px * v.u;
        const y0 = v.top - 0.47 * v.u;
        const y1 = v.top - 0.02 * v.u;
        const rot = side * (3 + (i % 3) * 1.6);
        const at = (x: number, y: number, r: number, s: number) =>
          `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r}deg) scale(${s})`;

        const anim = slip.animate(
          [
            {
              transform: at(x0, y0 - 30, rot * 2, 0.92),
              opacity: 0,
              easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)",
            },
            { transform: at(x0, y0, rot, 1), opacity: 1, offset: 0.24 },
            {
              transform: at(x0 + (x1 - x0) * 0.08, y0 + 4, rot, 1),
              opacity: 1,
              offset: 0.46,
              easing: "cubic-bezier(0.55, 0, 0.95, 0.45)",
            },
            { transform: at(x1, y1, rot * 2.4, 0.22), opacity: 0, offset: 1 },
          ],
          { duration: SLIP_MS, fill: "forwards" }
        );
        anim.onfinish = () => slip.remove();
        soundEngine.playCardSlam(i);

        later(() => {
          scene.dropTaskCube(i);
          setLanded((n) => n + 1);
        }, SLIP_MS * 0.84);
      }, INTRO_START + i * INTRO_GAP);
    });

    later(() => {
      scene.glideHome(GLIDE_MS);
      setPhase("home");
      onIntroEnd();
    }, INTRO_END);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      layer.replaceChildren();
    };
  }, [phase]);

  const skipIntro = () => {
    const scene = sceneRef.current;
    slipsRef.current?.replaceChildren();
    scene?.settle();
    scene?.glideHome(520);
    setLanded(TASKS.length);
    setPhase("home");
    onIntroEnd();
  };

  const addSugar = (clientX?: number) => {
    if (phase !== "home") return;
    sceneRef.current?.dropCube(clientX);
  };

  const caption =
    phase === "home"
      ? `${canHover ? "Klik" : "Ketuk"} gelasnya untuk menambah gula`
      : landed === 0
      ? "Satu tugas, satu kubus gula"
      : `${landed} tugas, ${landed} kubus gula`;

  const isResuming = resumePercent > 0;

  return (
    <section
      ref={heroRef}
      className={`beranda ${phase === "intro" ? "is-intro" : "is-home"}`}
      aria-labelledby="berandaTitle"
    >
      <canvas ref={canvasRef} className="beranda-canvas" aria-hidden="true" />
      <p ref={captionRef} className="glass-caption" aria-hidden="true">
        <i className="cube-dot" />
        <span>{caption}</span>
      </p>
      <div ref={slipsRef} className="beranda-slips" aria-hidden="true" />

      <div ref={gridRef} className="beranda-grid">
        <div className="beranda-copy">
          <h1 className="beranda-title" id="berandaTitle">
            {TITLE.map((pair, p) => (
              <span className="beranda-pair" key={p}>
                {pair.map((words, w) => (
                  <React.Fragment key={words}>
                    {w > 0 && " "}
                    <span className="beranda-line" style={{ ["--i" as string]: p * 2 + w }}>
                      <span>{words}</span>
                    </span>
                  </React.Fragment>
                ))}
              </span>
            ))}
          </h1>

          <p className="beranda-lede">
            Kami ingin tahu apakah banyaknya tugas kuliah berkaitan dengan seberapa
            sering kamu makan dan minum yang manis.
          </p>
        </div>

        <div
          ref={homeRef}
          className="glass-slot"
          role="button"
          tabIndex={0}
          aria-label="Gelas es teh. Tekan untuk menambah satu kubus gula."
          onClick={(e) => addSugar(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              addSugar();
            }
          }}
        />

        <nav className="beranda-actions" aria-label="Pilih halaman">
          <a
            className="cta"
            href="#/kuesioner"
            onClick={(e) => {
              e.preventDefault();
              onOpenKuesioner();
            }}
          >
            <i className="cube-dot cta-cube" aria-hidden="true" />
            <span className="cta-label">
              {isResuming ? "Lanjutkan kuesioner" : "Isi kuesioner"}
            </span>
            <span className="cta-sub">
              {isResuming
                ? `Sudah terisi ${resumePercent}%, lanjut dari yang belum dijawab`
                : "3–4 menit, anonim, ada undian Rp 50.000"}
            </span>
          </a>
          <p className="beranda-hasil">
            <a
              className="text-link"
              href="#/hasil"
              onClick={(e) => {
                e.preventDefault();
                onOpenHasil();
              }}
            >
              Hasil penelitian
            </a>{" "}
            dibuka setelah data terkumpul.
          </p>
        </nav>

        <p className="beranda-note">
          Tugas mata kuliah Metode Penelitian Kuantitatif, Fakultas Psikologi UGM.
        </p>
      </div>

      {phase === "intro" && (
        <button type="button" className="intro-skip" onClick={skipIntro}>
          Lewati intro
        </button>
      )}
    </section>
  );
};
