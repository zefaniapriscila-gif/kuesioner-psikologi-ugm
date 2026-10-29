import React, { useEffect, useRef, useState } from "react";
import { soundEngine } from "../lib/soundEngine";
import { CAPTION, createGlassScene, GlassScene, Slot } from "../lib/glassScene";
import { CubeMark } from "./CubeMark";
import { ArrowRight, Headphones } from "./Icons";

interface BerandaProps {
  isNightMode: boolean;
  playIntro: boolean;
  resumePercent: number;
  onIntroEnd: () => void;
  onOpenPenjelasan: () => void;
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

// Where each slip lands while the tasks pile up, in glass units from the centre
// of the rim, with its tilt: around the glass on wide screens, over its mouth
// when stacked. Even ones go left so they alternate like the sugar pile.
const PIN_WIDE: [number, number, number][] = [
  [-0.86, -0.18, -5],
  [0.88, -0.3, 4.5],
  [-0.62, -0.46, 3.5],
  [0.6, -0.52, -4],
  [-1.02, 0.1, -3],
  [1.04, -0.02, 4],
];
const PIN_STACKED: [number, number, number][] = [
  [-0.28, -0.3, -5],
  [0.27, -0.36, 4.5],
  [-0.22, -0.08, 3.5],
  [0.3, -0.15, -4],
  [-0.3, 0.14, -3],
  [0.24, 0.07, 4],
];

const CRAVINGS = ["Es kopi susu gula aren", "Boba brown sugar", "Martabak cokelat keju", "Es teh manis jumbo"];
const CLOCK = ["21.15", "22.30", "23.45", "23.59"];

// The headline, one stacked line each on wide screens
const TITLE: [string, string][] = [
  ["Tugas", "numpuk,"],
  ["gula ikut", "numpuk?"],
];

// The story, in ms from the moment the gate closes: the deadline closes in
// while the tasks pile up, then each one drops into the glass as a sugar cube
const IRIS_MS = 720;
const SLAM_AT = 300;
const SLAM_GAP = 150;
const SLAM_MS = 560;
const TICK_AT = 520;
const TICK_GAP = 400;
const BEAT_1 = 2150;
const DROP_AT = BEAT_1 + 250;
const DROP_GAP = 300;
const DROP_MS = 880;
const BEAT_2 = DROP_AT + (TASKS.length - 1) * DROP_GAP + DROP_MS + 300;
const INTRO_END = BEAT_2 + 1900;
const GLIDE_MS = 950;
const WIDE = 1000; // from here up the glass stands between the copy and the actions

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Phase = "gate" | "intro" | "home";
type Beat = "next" | "on" | "past";

// Lines that rise out of a mask, numbered for the stagger
const Lines: React.FC<{ pairs: string[][]; from: number; accent?: string[] }> = ({
  pairs,
  from,
  accent = [],
}) => {
  let n = from;
  return (
    <>
      {pairs.map((pair, p) => (
        <span className="beranda-pair" key={p}>
          {pair.map((words, w) => (
            <React.Fragment key={words}>
              {w > 0 && " "}
              <span
                className={`story-line ${accent.includes(words) ? "is-tea" : ""}`}
                style={{ ["--i" as string]: n++ }}
              >
                <span>{words}</span>
              </span>
            </React.Fragment>
          ))}
        </span>
      ))}
    </>
  );
};

export const Beranda: React.FC<BerandaProps> = ({
  isNightMode,
  playIntro,
  resumePercent,
  onIntroEnd,
  onOpenPenjelasan,
  onOpenKuesioner,
  onOpenHasil,
}) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slipsRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const captionSpanRef = useRef<HTMLSpanElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const gateTimers = useRef<number[]>([]);
  const sceneRef = useRef<GlassScene | null>(null);
  const nightRef = useRef(isNightMode);
  nightRef.current = isNightMode;

  const [phase, setPhase] = useState<Phase>(() =>
    playIntro && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "gate" : "home"
  );
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [gateShown, setGateShown] = useState(phase === "gate");
  const [gateLeaving, setGateLeaving] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [tick, setTick] = useState(0);
  const [canHover] = useState(() => window.matchMedia("(hover: hover)").matches);

  // ---------------------------------------------------------------------------
  // The glass: on wide screens it never moves, it stands in the middle of the
  // desk the whole time. Stacked, it plays the intro large under the story,
  // then settles between the copy and the actions.
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
      // Leave the top to the story and the bottom to the skip button
      const story = storyRef.current?.getBoundingClientRect();
      const y = Math.max(24, story ? story.bottom - hr.top + 14 : 0);
      const h = Math.max(220, Math.min(window.innerHeight - y - 56, 600));
      return { intro: { x: 0, y, w: hr.width, h }, home: slot };
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

  // Nothing behind the gate and the story can be reached until they are over
  useEffect(() => {
    if (gridRef.current) gridRef.current.inert = phase !== "home";
  }, [phase]);

  // The page stays put while the gate is up
  useEffect(() => {
    if (!gateShown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [gateShown]);

  useEffect(() => () => gateTimers.current.forEach((t) => clearTimeout(t)), []);

  const setCount = (n: number) => {
    if (captionSpanRef.current) {
      captionSpanRef.current.textContent =
        n === 0 ? "Satu tugas, satu kubus gula" : `${n} tugas, ${n} kubus gula`;
    }
  };

  // ---------------------------------------------------------------------------
  // The story: the tasks pile up on the desk, then each one falls into the
  // glass and lands as a sugar cube
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== "intro") return;
    const scene = sceneRef.current;
    const layer = slipsRef.current;
    const host = heroRef.current;
    if (!scene || !layer || !host) return;

    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    const at = (x: number, y: number, r: number, s: number) =>
      `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r}deg) scale(${s})`;

    setCount(0);
    setBeat(0);
    setTick(0);
    const wide = host.clientWidth >= WIDE;
    layer.style.setProperty("--u", `${Math.round(scene.view().u)}px`);
    const pins: { slip: HTMLElement; x: number; y: number; rot: number }[] = [];

    // Beat 0: the clock runs towards the deadline and the tasks slam down
    TASKS.forEach((task, i) => {
      later(() => {
        const v = scene.view();
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

        const [ox, oy, rot] = (wide ? PIN_WIDE : PIN_STACKED)[i];
        const half = slip.offsetWidth / 2 + 10;
        const x = clamp(v.cx + ox * v.u, half, host.clientWidth - half);
        const y = v.top + oy * v.u;
        pins[i] = { slip, x, y, rot };
        slip.animate(
          [
            { transform: at(x, y - 0.3 * v.u, rot * 2.5, 1.2), opacity: 0 },
            { transform: at(x, y, rot, 1), opacity: 1 },
          ],
          { duration: SLAM_MS, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)", fill: "forwards" }
        );
        soundEngine.playCardSlam(i);
      }, SLAM_AT + i * SLAM_GAP);
    });
    CLOCK.forEach((_, t) => {
      if (t === 0) return;
      later(() => {
        setTick(t);
        soundEngine.playClockTick(t === CLOCK.length - 1);
      }, TICK_AT + (t - 1) * TICK_GAP);
    });

    // Beat 1: the craving, while the slips drop into the glass one by one
    later(() => {
      setBeat(1);
      soundEngine.playHeroSugarImpact();
    }, BEAT_1);
    TASKS.forEach((_, i) => {
      later(() => {
        const p = pins[i];
        if (!p) return;
        const v = scene.view();
        const x1 = v.cx + scene.pileX(i) * v.u;
        const y1 = v.top - 0.02 * v.u;
        // Lift clear of the rim first, then fall into the glass
        const lx = p.x + (x1 - p.x) * 0.3;
        const ly = Math.min(p.y, v.top - 0.3 * v.u) - 0.05 * v.u;
        p.slip.style.zIndex = "1";
        const anim = p.slip.animate(
          [
            { transform: at(p.x, p.y, p.rot, 1), opacity: 1, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
            {
              transform: at(lx, ly, p.rot * 0.5, 1.04),
              opacity: 1,
              offset: 0.4,
              easing: "cubic-bezier(0.55, 0, 0.95, 0.45)",
            },
            { transform: at(x1, y1, p.rot * 2.4, 0.22), opacity: 0 },
          ],
          { duration: DROP_MS, fill: "forwards" }
        );
        anim.onfinish = () => p.slip.remove();

        later(() => {
          scene.dropTaskCube(i);
          setCount(i + 1);
        }, DROP_MS * 0.84);
      }, DROP_AT + i * DROP_GAP);
    });

    // Beat 2: the invitation
    later(() => {
      setBeat(2);
      soundEngine.playWarmInviteChord();
    }, BEAT_2);

    // Then the beranda settles in around the glass
    later(() => {
      scene.glideHome(GLIDE_MS);
      setBeat(3);
      setPhase("home");
      onIntroEnd();
      // One pluck per headline line as it rises (outlives this effect on purpose)
      TITLE.flat().forEach((_, i) => {
        window.setTimeout(() => soundEngine.playLetterErupt(i + 2), 420 + i * 70);
      });
    }, INTRO_END);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      layer.replaceChildren();
    };
  }, [phase]);

  // One button starts everything: it unlocks the audio inside the gesture, the
  // page closes in on it, and the story plays
  const begin = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (gateLeaving) return;
    const r = e.currentTarget.getBoundingClientRect();
    gateRef.current?.style.setProperty("--ix", `${r.left + r.width / 2}px`);
    gateRef.current?.style.setProperty("--iy", `${r.top + r.height / 2}px`);
    soundEngine.unlock().then(() => soundEngine.playIceClink());
    setGateLeaving(true);
    gateTimers.current.push(
      window.setTimeout(() => setPhase("intro"), IRIS_MS - 160),
      window.setTimeout(() => setGateShown(false), IRIS_MS)
    );
  };

  const skipIntro = () => {
    const scene = sceneRef.current;
    slipsRef.current?.replaceChildren();
    scene?.settle();
    scene?.glideHome(520);
    setCount(TASKS.length);
    setBeat(3);
    setPhase("home");
    onIntroEnd();
  };

  const addSugar = (clientX?: number) => {
    if (phase !== "home") return;
    sceneRef.current?.dropCube(clientX);
  };

  const stateOf = (i: number): Beat => (beat < i ? "next" : beat === i ? "on" : "past");

  const caption =
    phase === "home"
      ? `${canHover ? "Klik" : "Ketuk"} gelasnya untuk menambah gula`
      : "Satu tugas, satu kubus gula";

  const isResuming = resumePercent > 0;

  // Read about the study, take part, see what came of it
  const cards = [
    {
      href: "#/penjelasan",
      label: "Penjelasan Penelitian",
      sub: "Siapa kami dan untuk apa survei ini",
      open: onOpenPenjelasan,
    },
    {
      href: "#/kuesioner",
      label: isResuming ? "Lanjutkan Penelitian" : "Mulai Penelitian",
      sub: isResuming
        ? `Sudah terisi ${resumePercent}%, lanjut dari yang belum dijawab`
        : "3–4 menit, anonim",
      open: onOpenKuesioner,
      primary: true,
    },
    {
      href: "#/hasil",
      label: "Hasil Penelitian",
      sub: "Dibuka setelah data terkumpul",
      open: onOpenHasil,
    },
  ];

  return (
    <section
      ref={heroRef}
      className={`beranda ${phase === "home" ? "is-home" : "is-intro"}`}
      aria-labelledby="berandaTitle"
    >
      <canvas ref={canvasRef} className="beranda-canvas" aria-hidden="true" />
      <p ref={captionRef} className="glass-caption" aria-hidden="true">
        <i className="cube-dot" />
        <span ref={captionSpanRef}>{caption}</span>
      </p>

      <div className="story" aria-hidden="true">
        <div ref={storyRef} className="story-text">
          <div className="story-beat" data-state={stateOf(0)}>
            <span className="story-line story-kicker" style={{ ["--i" as string]: 0 }}>
              <span>
                <i className={`story-clock ${tick === CLOCK.length - 1 ? "is-late" : ""}`} />
                Tenggat <b>{CLOCK[tick]}</b> WIB
              </span>
            </span>
            <span className="story-line story-lead" style={{ ["--i" as string]: 1 }}>
              <span>Pernahkah kamu</span>
            </span>
            <span className="story-title">
              <Lines
                pairs={[
                  ["Lagi", "banyak"],
                  ["tugas", "kuliah?"],
                ]}
                from={2}
              />
            </span>
          </div>

          <div className="story-beat" data-state={stateOf(1)}>
            <span className="story-line story-kicker" style={{ ["--i" as string]: 0 }}>
              <span>
                <i className="cube-dot" />
                Pelarian manis
              </span>
            </span>
            <span className="story-line story-lead" style={{ ["--i" as string]: 1 }}>
              <span>…lalu tiba-tiba mencari</span>
            </span>
            <span className="story-title">
              <Lines pairs={[["yang", "manis?"]]} from={2} accent={["manis?"]} />
            </span>
          </div>

          <div className="story-beat" data-state={stateOf(2)}>
            <span className="story-line story-kicker" style={{ ["--i" as string]: 0 }}>
              <span>
                <CubeMark className="story-mark" />
                Kuesioner Psikologi UGM
              </span>
            </span>
            <span className="story-invite">
              <Lines
                pairs={[["Mari bantu kami"], ["dengan", "mengisi"], ["kuesioner ini."]]}
                from={1}
                accent={["mengisi", "kuesioner ini."]}
              />
            </span>
          </div>
        </div>

        <ul className="story-cravings" data-state={stateOf(1)}>
          {CRAVINGS.map((c, i) => (
            <li key={c} style={{ ["--i" as string]: i, ["--r" as string]: `${i % 2 ? 1.4 : -1.2}deg` }}>
              <i className="cube-dot" />
              {c}
            </li>
          ))}
        </ul>
      </div>

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
          <ol className="beranda-cards">
            {cards.map((card, i) => (
              <li key={card.href} style={{ ["--i" as string]: i }}>
                <a
                  className={`kartu ${card.primary ? "is-primary" : ""}`}
                  href={card.href}
                  onClick={(e) => {
                    e.preventDefault();
                    card.open();
                  }}
                >
                  <span className="kartu-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="kartu-label">{card.label}</span>
                  <span className="kartu-sub">{card.sub}</span>
                  <ArrowRight className="kartu-arrow" size={18} weight="bold" />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <p className="beranda-note">
          Tugas mata kuliah Metode Penelitian Kuantitatif, Fakultas Psikologi UGM.
        </p>
      </div>

      {phase === "intro" && (
        <div className="intro-bar">
          <span className="intro-progress" aria-hidden="true">
            <i style={{ animationDuration: `${INTRO_END}ms` }} />
          </span>
          <button type="button" className="intro-skip" onClick={skipIntro}>
            Lewati intro
          </button>
        </div>
      )}

      {gateShown && (
        <div
          ref={gateRef}
          className={`gate ${gateLeaving ? "is-leaving" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gateTitle"
        >
          <div className="gate-light gate-sun" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="gate-light gate-lamp" aria-hidden="true" />

          <div className="gate-inner">
            <p className="gate-kicker">
              <CubeMark className="gate-mark" />
              Metode Penelitian Kuantitatif · Psikologi UGM
            </p>
            <h2 className="gate-title" id="gateTitle">
              Jumlah <em className="is-pen">Tugas Akademik</em> dan Kecenderungan Perilaku{" "}
              <em className="is-tea">Konsumsi Tinggi Gula</em> pada Mahasiswa Psikologi UGM
            </h2>
            <p className="gate-sub">
              Cerita singkat tentang tumpukan tugas kuliah dan segelas es teh manis.
            </p>
            <button type="button" className="cta gate-start" onClick={begin} autoFocus>
              <span className="gate-ring" aria-hidden="true" />
              <span className="gate-ring is-late" aria-hidden="true" />
              <i className="cube-dot cta-cube" aria-hidden="true" />
              <span className="cta-label">Mulai</span>
              <span className="cta-sub">Putar cerita pembukanya, 7 detik</span>
            </button>
            {!soundEngine.isMuted && (
              <p className="gate-hint">
                <Headphones size={15} weight="bold" />
                Nyalakan suara untuk pengalaman terbaik
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
