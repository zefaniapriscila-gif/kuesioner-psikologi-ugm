import React, { useEffect, useRef, useState } from "react";
import { soundEngine } from "../lib/soundEngine";
import {
  ArrowRight,
  Play,
  Headphones,
  ArrowsClockwise,
  Moon,
  Sun,
  Plus,
} from "@phosphor-icons/react";

interface SweetBrewHeroProps {
  onStartClick: () => void;
  replayTrigger: number;
  onIntroStateChange?: (isPlaying: boolean) => void;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  onReplayIntro: () => void;
}

interface WaveNode {
  y: number;
  vy: number;
  targetY: number;
}

interface IceCube {
  x: number; // 0..1 normalized width
  y: number; // px
  vx: number;
  vy: number;
  size: number;
  angle: number;
  va: number;
}

interface FallingSugarCube {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  va: number;
  dissolve: number; // 1 -> 0
  hasSplashed: boolean;
  isHeroCube?: boolean;
}

interface LiquidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  kind: "bubble" | "splash" | "boba";
}

interface ShockwaveRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

interface PourStream {
  xFrac: number;
  width: number;
  alpha: number;
  active: boolean;
}

type IntroBeat = 0 | 1 | 2 | 3;
type IntroStatus = "waiting" | "playing" | "done";

// Outer-perimeter coordinates so Task Cards NEVER overlap the center headline!
const PERIMETER_TASKS = [
  {
    title: "Laporan Praktikum Psikodiagnostika",
    tag: "DEADLINE 23:59",
    posStyle: { left: "4.5vw", top: "14vh" },
    rot: "-5deg",
    blastX: "-28vw",
    blastY: "-22vh",
    blastRot: "-32deg",
  },
  {
    title: "Review 15 Jurnal Internasional",
    tag: "BESOK PAGI",
    posStyle: { right: "4.5vw", top: "14vh" },
    rot: "4.5deg",
    blastX: "28vw",
    blastY: "-22vh",
    blastRot: "34deg",
  },
  {
    title: "Revisi Makalah Kelompok Bab 3",
    tag: "34 HALAMAN",
    posStyle: { left: "3.5vw", top: "46vh" },
    rot: "3.5deg",
    blastX: "-30vw",
    blastY: "8vh",
    blastRot: "-28deg",
  },
  {
    title: "Olahan Data & Output SPSS",
    tag: "BELUM SELESAI",
    posStyle: { right: "3.5vw", top: "46vh" },
    rot: "-4deg",
    blastX: "30vw",
    blastY: "8vh",
    blastRot: "30deg",
  },
  {
    title: "Tugas Resume Kuliah Mingguan",
    tag: "KUMPUL HARI INI",
    posStyle: { left: "7vw", bottom: "16vh" },
    rot: "-3deg",
    blastX: "-24vw",
    blastY: "26vh",
    blastRot: "-24deg",
  },
  {
    title: "Slide Presentasi Kelompok",
    tag: "18 SLIDE",
    posStyle: { right: "7vw", bottom: "16vh" },
    rot: "4deg",
    blastX: "24vw",
    blastY: "26vh",
    blastRot: "26deg",
  },
];

// Outer-corner coordinates for Sweet Craving Pills in Beat 1 (zero overlap with center headline)
const CRAVING_PILLS = [
  { label: "Es Kopi Susu Gula Aren", posStyle: { left: "6vw", top: "18vh" }, delay: "90ms" },
  { label: "Brown Sugar Boba Fresh Milk", posStyle: { right: "6vw", top: "18vh" }, delay: "170ms" },
  { label: "Matcha Latte Extra Sweet", posStyle: { left: "8vw", bottom: "20vh" }, delay: "250ms" },
  { label: "Martabak & Cokelat Lumer", posStyle: { right: "8vw", bottom: "20vh" }, delay: "330ms" },
];

export const SweetBrewHero: React.FC<SweetBrewHeroProps> = ({
  onStartClick,
  replayTrigger,
  onIntroStateChange,
  isNightMode,
  onToggleNightMode,
  onReplayIntro,
}) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [introStatus, setIntroStatus] = useState<IntroStatus>("waiting");
  const [beat, setBeat] = useState<IntroBeat>(0);
  const [clockText, setClockText] = useState<string>("21:15");
  const [cubesDropped, setCubesDropped] = useState<number>(5);
  const [impactFlash, setImpactFlash] = useState<boolean>(false);
  const [timelineKey, setTimelineKey] = useState<number>(0);
  // Single "Mulai" start splash: show -> leaving (iris-out animation) -> gone
  const [splashPhase, setSplashPhase] = useState<"show" | "leaving" | "gone">("show");

  const isNightRef = useRef<boolean>(isNightMode);
  isNightRef.current = isNightMode;

  const startIntro = async () => {
    soundEngine.unmute();
    await soundEngine.unlock();
    setSplashPhase("gone");
    setIntroStatus("playing");
    setTimelineKey((k) => k + 1);
  };

  // One button to start everything: unlock audio inside the user gesture,
  // play the iris-out transition, then kick off the cinematic intro.
  const handleBegin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (splashPhase !== "show") return;
    soundEngine.unmute();
    soundEngine.unlock().then(() => soundEngine.playIceClink());
    setSplashPhase("leaving");
    window.setTimeout(() => {
      startIntro();
    }, 720);
  };

  // Lock page scroll while the start splash is visible
  useEffect(() => {
    if (splashPhase === "gone") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [splashPhase]);

  // Only replay when replayTrigger actually changes (safe under StrictMode double effects)
  const lastReplayRef = useRef(replayTrigger);
  useEffect(() => {
    if (lastReplayRef.current === replayTrigger) return;
    lastReplayRef.current = replayTrigger;
    startIntro();
  }, [replayTrigger]);

  const physRef = useRef<{
    nodes: WaveNode[];
    iceCubes: IceCube[];
    sugarCubes: FallingSugarCube[];
    particles: LiquidParticle[];
    shockwaves: ShockwaveRing[];
    pourStreams: PourStream[];
    currentFillFrac: number;
    targetFillFrac: number;
    lastPointerX: number | null;
    lastPointerY: number | null;
    dropSugarAt: (
      px: number,
      py: number,
      count?: number,
      isHero?: boolean,
      withSound?: boolean
    ) => void;
    eruptLettersSplash: () => void;
  }>({
    nodes: [],
    iceCubes: [],
    sugarCubes: [],
    particles: [],
    shockwaves: [],
    pourStreams: [
      { xFrac: 0.28, width: 18, alpha: 0, active: false },
      { xFrac: 0.5, width: 28, alpha: 0, active: false },
      { xFrac: 0.72, width: 16, alpha: 0, active: false },
    ],
    currentFillFrac: 0.0,
    targetFillFrac: 0.0,
    lastPointerX: null,
    lastPointerY: null,
    dropSugarAt: () => {},
    eruptLettersSplash: () => {},
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isNightMode ? "night" : "day";
  }, [isNightMode]);

  // Prepare the AudioContext early (actual unlock happens on the "Mulai" click)
  useEffect(() => {
    soundEngine.initAndTryAutoplay();
  }, []);

  // Main 60fps Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NUM_NODES = 60;
    const nodes: WaveNode[] = Array.from({ length: NUM_NODES }, () => ({
      y: 0,
      vy: 0,
      targetY: 0,
    }));

    const iceCubes: IceCube[] = [
      { x: 0.15, y: -140, vx: 0, vy: 0, size: 60, angle: -0.18, va: 0 },
      { x: 0.33, y: -260, vx: 0, vy: 0, size: 68, angle: 0.15, va: 0 },
      { x: 0.51, y: -190, vx: 0, vy: 0, size: 64, angle: -0.09, va: 0 },
      { x: 0.69, y: -310, vx: 0, vy: 0, size: 70, angle: 0.21, va: 0 },
      { x: 0.85, y: -220, vx: 0, vy: 0, size: 56, angle: -0.14, va: 0 },
    ];

    const particles: LiquidParticle[] = [];
    for (let i = 0; i < 28; i++) {
      const isBoba = i < 13;
      particles.push({
        x: isBoba ? 0.07 + (i / 12) * 0.86 : Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.28 - Math.random() * 0.45,
        r: isBoba ? 10.5 + (i % 3) * 2 : 2 + Math.random() * 3.2,
        alpha: isBoba ? 0.95 : 0.25 + Math.random() * 0.35,
        kind: isBoba ? "boba" : "bubble",
      });
    }

    const sugarCubes: FallingSugarCube[] = [];
    const shockwaves: ShockwaveRing[] = [];

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.clientWidth;
      height = hero.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const baseSurfaceY = height * (1 - physRef.current.currentFillFrac);
      nodes.forEach((n) => {
        n.targetY = baseSurfaceY;
        if (n.y === 0) {
          n.y = height + 40;
        }
      });
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hero);

    const getWaveYAtX = (xPx: number): { y: number; slope: number } => {
      const f = Math.max(0, Math.min(1, xPx / Math.max(1, width))) * (NUM_NODES - 1);
      const i0 = Math.floor(f);
      const i1 = Math.min(NUM_NODES - 1, i0 + 1);
      const t = f - i0;
      const y0 = nodes[i0]?.y ?? height;
      const y1 = nodes[i1]?.y ?? height;
      const stepX = width / (NUM_NODES - 1);
      return {
        y: y0 + (y1 - y0) * t,
        slope: (y1 - y0) / Math.max(1, stepX),
      };
    };

    const splashWaveAt = (xPx: number, w: number, impulse: number) => {
      const idx = Math.max(
        1,
        Math.min(NUM_NODES - 2, Math.round((xPx / Math.max(1, w)) * (NUM_NODES - 1)))
      );
      for (let i = Math.max(1, idx - 4); i <= Math.min(NUM_NODES - 2, idx + 4); i++) {
        const dist = Math.abs(i - idx);
        const falloff = Math.cos((dist / 5) * (Math.PI / 2));
        nodes[i].vy += impulse * falloff;
      }
    };

    const dropSugarAt = (
      px: number,
      py: number,
      count = 1,
      isHero = false,
      withSound = true
    ) => {
      if (withSound && !isHero) {
        soundEngine.playSugarDrop();
      }
      for (let c = 0; c < count; c++) {
        const isMainHero = isHero && c === 0;
        sugarCubes.push({
          x: px + (c - (count - 1) / 2) * (isHero ? 74 : 38) + (Math.random() - 0.5) * 12,
          y: py - c * (isHero ? 55 : 28),
          vx: (Math.random() - 0.5) * (isHero ? 2.8 : 1.6),
          vy: isMainHero ? 5.5 : 2.6 + Math.random() * 1.8,
          size: isMainHero ? 56 : 28 + Math.random() * 8,
          angle: (Math.random() - 0.5) * 0.6,
          va: (Math.random() - 0.5) * 0.08,
          dissolve: 1,
          hasSplashed: false,
          isHeroCube: isMainHero,
        });
      }
      setCubesDropped((n) => n + count);
    };

    const eruptLettersSplash = () => {
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          soundEngine.playLetterErupt(i);
          const frac = 0.2 + (i / 6) * 0.6;
          const lx = width * frac;
          const { y: wy } = getWaveYAtX(lx);
          splashWaveAt(lx, width, -18);
          shockwaves.push({
            x: lx,
            y: wy,
            r: 8,
            maxR: 95,
            alpha: 0.75,
          });
          for (let d = 0; d < 8; d++) {
            particles.push({
              x: lx / Math.max(1, width),
              y: wy / Math.max(1, height),
              vx: (Math.random() - 0.5) * 4.5,
              vy: -3.5 - Math.random() * 4.2,
              r: 2.5 + Math.random() * 3,
              alpha: 0.95,
              kind: "splash",
            });
          }
        }, i * 65);
      }
    };

    physRef.current.nodes = nodes;
    physRef.current.iceCubes = iceCubes;
    physRef.current.sugarCubes = sugarCubes;
    physRef.current.particles = particles;
    physRef.current.shockwaves = shockwaves;
    physRef.current.dropSugarAt = dropSugarAt;
    physRef.current.eruptLettersSplash = eruptLettersSplash;

    let rafId = 0;
    const render = (now: number) => {
      const isNight = isNightRef.current;

      physRef.current.currentFillFrac +=
        (physRef.current.targetFillFrac - physRef.current.currentFillFrac) * 0.052;

      const surfaceBaseY = height * (1 - physRef.current.currentFillFrac);

      // 1. Update Hooke's Law Wave Nodes
      const k = 0.03;
      const damp = 0.905;
      for (let i = 0; i < NUM_NODES; i++) {
        const gentleSwell =
          Math.sin(now * 0.002 + i * 0.25) * 4.5 +
          Math.cos(now * 0.0012 - i * 0.16) * 2.5;
        nodes[i].targetY = surfaceBaseY + gentleSwell;
        const dy = nodes[i].targetY - nodes[i].y;
        nodes[i].vy = (nodes[i].vy + dy * k) * damp;
      }

      const spread = 0.19;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < NUM_NODES; i++) {
          if (i > 0) {
            const d = spread * (nodes[i].y - nodes[i - 1].y);
            nodes[i - 1].vy += d;
          }
          if (i < NUM_NODES - 1) {
            const d = spread * (nodes[i].y - nodes[i + 1].y);
            nodes[i + 1].vy += d;
          }
        }
        for (let i = 0; i < NUM_NODES; i++) {
          nodes[i].y += nodes[i].vy;
        }
      }

      ctx.clearRect(0, 0, width, height);

      // 2. Pouring Golden Syrup Streams from Top (Active during Beat 1)
      physRef.current.pourStreams.forEach((stream, sIdx) => {
        if (stream.active) {
          stream.alpha = Math.min(1, stream.alpha + 0.08);
        } else {
          stream.alpha = Math.max(0, stream.alpha - 0.06);
        }
        if (stream.alpha <= 0.01) return;

        const sx = stream.xFrac * width;
        const { y: wy } = getWaveYAtX(sx);
        splashWaveAt(sx, width, 1.4 * stream.alpha);

        ctx.save();
        ctx.beginPath();
        const steps = 18;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const py = t * (wy + 12);
          const wobble = Math.sin(t * 9 - now * 0.018 + sIdx) * 3.5;
          const halfW = stream.width * (1 - t * 0.32) * stream.alpha * 0.5;
          if (i === 0) ctx.moveTo(sx - halfW + wobble, py);
          else ctx.lineTo(sx - halfW + wobble, py);
        }
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const py = t * (wy + 12);
          const wobble = Math.sin(t * 9 - now * 0.018 + sIdx) * 3.5;
          const halfW = stream.width * (1 - t * 0.32) * stream.alpha * 0.5;
          ctx.lineTo(sx + halfW + wobble, py);
        }
        ctx.closePath();
        const pGrad = ctx.createLinearGradient(0, 0, 0, wy);
        pGrad.addColorStop(0, `rgba(245, 178, 72, ${0.85 * stream.alpha})`);
        pGrad.addColorStop(0.6, `rgba(214, 110, 24, ${0.92 * stream.alpha})`);
        pGrad.addColorStop(1, `rgba(255, 224, 150, ${0.95 * stream.alpha})`);
        ctx.fillStyle = pGrad;
        ctx.fill();
        ctx.restore();
      });

      // 3. Liquid Body & Floating Ice Cubes
      if (physRef.current.currentFillFrac > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < NUM_NODES; i++) {
          const x = (i / (NUM_NODES - 1)) * width;
          const y = nodes[i].y - 12 + Math.sin(now * 0.0024 + i * 0.35) * 4.5;
          if (i === 0) ctx.lineTo(x, y);
          else {
            const prevX = ((i - 1) / (NUM_NODES - 1)) * width;
            const prevY =
              nodes[i - 1].y - 12 + Math.sin(now * 0.0024 + (i - 1) * 0.35) * 4.5;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) * 0.5, (prevY + y) * 0.5);
          }
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = isNight
          ? "rgba(212, 124, 44, 0.28)"
          : "rgba(244, 182, 88, 0.42)";
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let i = 0; i < NUM_NODES; i++) {
          const x = (i / (NUM_NODES - 1)) * width;
          const y = nodes[i].y;
          if (i === 0) ctx.lineTo(x, y);
          else {
            const prevX = ((i - 1) / (NUM_NODES - 1)) * width;
            const prevY = nodes[i - 1].y;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) * 0.5, (prevY + y) * 0.5);
          }
        }
        ctx.lineTo(width, nodes[NUM_NODES - 1].y);
        ctx.lineTo(width, height);
        ctx.closePath();

        const liqGrad = ctx.createLinearGradient(0, surfaceBaseY - 20, 0, height);
        if (isNight) {
          liqGrad.addColorStop(0, "rgba(220, 128, 40, 0.80)");
          liqGrad.addColorStop(0.4, "rgba(130, 56, 16, 0.90)");
          liqGrad.addColorStop(1, "rgba(26, 12, 6, 0.97)");
        } else {
          liqGrad.addColorStop(0, "rgba(248, 184, 78, 0.78)");
          liqGrad.addColorStop(0.48, "rgba(214, 114, 28, 0.87)");
          liqGrad.addColorStop(1, "rgba(144, 56, 11, 0.94)");
        }
        ctx.fillStyle = liqGrad;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < NUM_NODES; i++) {
          const x = (i / (NUM_NODES - 1)) * width;
          const y = nodes[i].y;
          if (i === 0) ctx.moveTo(x, y);
          else {
            const prevX = ((i - 1) / (NUM_NODES - 1)) * width;
            const prevY = nodes[i - 1].y;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) * 0.5, (prevY + y) * 0.5);
          }
        }
        ctx.strokeStyle = isNight
          ? "rgba(255, 224, 170, 0.62)"
          : "rgba(255, 253, 245, 0.88)";
        ctx.lineWidth = 2.8;
        ctx.stroke();
        ctx.restore();

        iceCubes.forEach((cube, idx) => {
          const cx = cube.x * width;
          const { y: waveY, slope } = getWaveYAtX(cx);
          const submerged = cube.y + cube.size * 0.34 - waveY;

          if (submerged > 0) {
            const buoy = Math.min(submerged, cube.size * 1.2) * 0.02;
            cube.vy -= buoy;
            cube.vy *= 0.87;
            cube.va += (slope * 0.55 - cube.angle) * 0.034;
            cube.va *= 0.86;
          } else {
            cube.vy += 0.4;
            cube.vy *= 0.98;
          }

          cube.x +=
            Math.sin(now * 0.0007 + idx * 1.7) * 0.00018 +
            cube.vx / Math.max(1, width);
          cube.vx *= 0.94;
          cube.x = Math.max(0.08, Math.min(0.92, cube.x));

          cube.y += cube.vy;
          cube.angle += cube.va;

          ctx.save();
          ctx.translate(cube.x * width, cube.y);
          ctx.rotate(cube.angle);
          const half = cube.size * 0.5;
          const r = cube.size * 0.22;

          ctx.beginPath();
          ctx.roundRect(-half, -half, cube.size, cube.size, r);
          const iceGrad = ctx.createLinearGradient(-half, -half, half, half);
          if (isNight) {
            iceGrad.addColorStop(0, "rgba(255, 245, 230, 0.48)");
            iceGrad.addColorStop(0.6, "rgba(245, 195, 135, 0.24)");
            iceGrad.addColorStop(1, "rgba(180, 105, 45, 0.3)");
          } else {
            iceGrad.addColorStop(0, "rgba(255, 255, 255, 0.84)");
            iceGrad.addColorStop(0.55, "rgba(255, 248, 235, 0.5)");
            iceGrad.addColorStop(1, "rgba(245, 208, 148, 0.36)");
          }
          ctx.fillStyle = iceGrad;
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = isNight
            ? "rgba(255, 235, 205, 0.55)"
            : "rgba(255, 255, 255, 0.92)";
          ctx.stroke();

          ctx.beginPath();
          ctx.roundRect(-half * 0.68, -half * 0.68, cube.size * 0.42, cube.size * 0.22, 6);
          ctx.fillStyle = isNight
            ? "rgba(255, 245, 230, 0.32)"
            : "rgba(255, 255, 255, 0.72)";
          ctx.fill();
          ctx.restore();
        });
      }

      // 4. Shockwave Rings
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.11 + 2.2;
        sw.alpha *= 0.92;
        if (sw.alpha <= 0.02) {
          shockwaves.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.r, sw.r * 0.38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 235, 190, ${sw.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // 5. Falling & Dissolving Sugar Cubes
      for (let i = sugarCubes.length - 1; i >= 0; i--) {
        const sc = sugarCubes[i];
        const { y: waveY } = getWaveYAtX(sc.x);

        if (sc.y < waveY) {
          sc.vy += 0.48;
        } else {
          if (!sc.hasSplashed) {
            sc.hasSplashed = true;
            const impulse = sc.isHeroCube ? 32 : Math.min(22, sc.vy * 1.6);
            splashWaveAt(sc.x, width, impulse);
            shockwaves.push({
              x: sc.x,
              y: waveY,
              r: 12,
              maxR: sc.isHeroCube ? 280 : 130,
              alpha: 0.9,
            });
            const dropCount = sc.isHeroCube ? 22 : 11;
            for (let d = 0; d < dropCount; d++) {
              particles.push({
                x: sc.x / Math.max(1, width),
                y: waveY / Math.max(1, height),
                vx: (Math.random() - 0.5) * (sc.isHeroCube ? 8.5 : 4.5),
                vy: -(sc.isHeroCube ? 4.5 : 2.5) - Math.random() * 5,
                r: 2.5 + Math.random() * 3.8,
                alpha: 0.95,
                kind: "splash",
              });
            }
          }
          sc.vy = sc.vy * 0.82 + 0.16;
          sc.vx *= 0.92;
          sc.dissolve -= 0.0055;
        }

        sc.x += sc.vx;
        sc.y += sc.vy;
        sc.angle += sc.va;

        if (sc.dissolve <= 0.05 || sc.y > height + 60) {
          sugarCubes.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(sc.angle);
        const s = sc.size * sc.dissolve;

        ctx.beginPath();
        ctx.roundRect(-s * 0.5, -s * 0.5, s, s, s * 0.2);
        const scGrad = ctx.createLinearGradient(-s * 0.5, -s * 0.5, s * 0.5, s * 0.5);
        scGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * sc.dissolve})`);
        scGrad.addColorStop(0.65, `rgba(255, 244, 224, ${0.94 * sc.dissolve})`);
        scGrad.addColorStop(1, `rgba(240, 205, 150, ${0.9 * sc.dissolve})`);
        ctx.fillStyle = scGrad;
        ctx.shadowColor = "rgba(245, 175, 65, 0.65)";
        ctx.shadowBlur = sc.isHeroCube ? 24 : 12;
        ctx.fill();
        ctx.strokeStyle = `rgba(230, 185, 120, ${0.8 * sc.dissolve})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(-s * 0.32, -s * 0.32, s * 0.38, s * 0.38, s * 0.08);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * sc.dissolve})`;
        ctx.fill();
        ctx.restore();
      }

      // 6. Boba Pearls, Bubbles & Splash Droplets
      if (physRef.current.currentFillFrac > 0.04) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          if (p.kind === "splash") {
            p.x += p.vx / Math.max(1, width);
            p.y += p.vy / Math.max(1, height);
            p.vy += 0.24;
            p.alpha -= 0.022;
            if (p.alpha <= 0) {
              particles.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
            ctx.fillStyle = isNight
              ? `rgba(255, 200, 120, ${p.alpha})`
              : `rgba(235, 145, 40, ${p.alpha})`;
            ctx.fill();
            continue;
          }

          if (p.kind === "boba") {
            const px = (p.x + Math.sin(now * 0.001 + i) * 0.012) * width;
            const py =
              height - 22 - (i % 2) * 14 + Math.cos(now * 0.0015 + i * 0.7) * 3;
            ctx.beginPath();
            ctx.arc(px, py, p.r, 0, Math.PI * 2);
            const bobaGrad = ctx.createRadialGradient(
              px - p.r * 0.3,
              py - p.r * 0.3,
              1,
              px,
              py,
              p.r
            );
            bobaGrad.addColorStop(0, "#5c341d");
            bobaGrad.addColorStop(0.55, "#261208");
            bobaGrad.addColorStop(1, "#120703");
            ctx.fillStyle = bobaGrad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(px - p.r * 0.32, py - p.r * 0.32, p.r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 235, 205, 0.45)";
            ctx.fill();
            continue;
          }

          const px = (p.x + Math.sin(now * 0.0012 + i) * 0.008) * width;
          const { y: waveY } = getWaveYAtX(px);
          let py = p.y * height + p.vy;
          if (py < waveY + 14) {
            py = height - 12;
            p.x = Math.random();
          }
          p.y = py / Math.max(1, height);

          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.strokeStyle = isNight
            ? `rgba(255, 225, 175, ${p.alpha})`
            : `rgba(255, 252, 242, ${p.alpha * 1.2})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  // =========================================================================
  // CHOREOGRAPHED 4-BEAT CINEMATIC OPENING SEQUENCE + PROCEDURAL SOUNDTRACK
  // =========================================================================
  useEffect(() => {
    if (introStatus !== "playing") {
      if (introStatus === "done") {
        setBeat(3);
        onIntroStateChange?.(false);
      } else {
        // "waiting"
        setBeat(0);
        setClockText("21:15");
        onIntroStateChange?.(true);
      }
      return;
    }

    setBeat(0);
    setClockText("21:15");
    setImpactFlash(false);
    onIntroStateChange?.(true);

    physRef.current.currentFillFrac = 0.0;
    physRef.current.targetFillFrac = 0.0;
    physRef.current.pourStreams.forEach((s) => {
      s.active = false;
      s.alpha = 0;
    });
    physRef.current.iceCubes.forEach((c, idx) => {
      c.y = -150 - idx * 55;
      c.vy = 0;
    });
    physRef.current.sugarCubes.length = 0;
    physRef.current.shockwaves.length = 0;

    // Sound: 6 Task cards slamming onto the perimeter desk
    const slamTimers = PERIMETER_TASKS.map((_, idx) =>
      window.setTimeout(() => {
        soundEngine.playCardSlam(idx);
      }, 90 + idx * 135)
    );

    // Sound & Visual: Deadline Clock Ticks (21:15 -> 22:30 -> 23:45 -> 23:59 Alarm!)
    const c1 = window.setTimeout(() => {
      setClockText("22:30");
      soundEngine.playClockTick(false);
    }, 360);
    const c2 = window.setTimeout(() => {
      setClockText("23:45");
      soundEngine.playClockTick(false);
    }, 720);
    const c3 = window.setTimeout(() => {
      setClockText("23:59");
      soundEngine.playClockTick(true);
    }, 1080);

    // BEAT 1 (1.85s): Giant Sugar Cubes plummet + Golden Syrup Streams pour + Big Impact Splash Sound!
    const t1 = window.setTimeout(() => {
      setBeat(1);
      setImpactFlash(true);
      soundEngine.playHeroSugarImpact();
      setTimeout(() => setImpactFlash(false), 450);

      physRef.current.targetFillFrac = 0.56;
      physRef.current.pourStreams.forEach((s) => {
        s.active = true;
      });

      const heroW = heroRef.current?.clientWidth || window.innerWidth;
      physRef.current.dropSugarAt(heroW * 0.5, 40, 5, true, false);
    }, 1850);

    const tPourStop = window.setTimeout(() => {
      physRef.current.pourStreams.forEach((s) => {
        s.active = false;
      });
    }, 3250);

    // BEAT 2 (3.55s): Warm Rhodes Invite Chord + "Mari bantu kami dengan mengisi kuesioner ini."
    const t2 = window.setTimeout(() => {
      setBeat(2);
      soundEngine.playWarmInviteChord();
      const heroW = heroRef.current?.clientWidth || window.innerWidth;
      physRef.current.dropSugarAt(heroW * 0.32, 70, 1, false, false);
      physRef.current.dropSugarAt(heroW * 0.68, 70, 1, false, false);
    }, 3550);

    // BEAT 3 (5.25s): "TAKARAN" erupts letter-by-letter out of the liquid meniscus with marimba water plucks!
    const t3 = window.setTimeout(() => {
      setBeat(3);
      setIntroStatus("done");
      physRef.current.eruptLettersSplash();
      onIntroStateChange?.(false);
    }, 5250);

    return () => {
      slamTimers.forEach((id) => clearTimeout(id));
      clearTimeout(c1);
      clearTimeout(c2);
      clearTimeout(c3);
      clearTimeout(t1);
      clearTimeout(tPourStop);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [introStatus, timelineKey]);

  const handleSkipIntro = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundEngine.unlock();
    physRef.current.pourStreams.forEach((s) => {
      s.active = false;
    });
    physRef.current.targetFillFrac = 0.56;
    setBeat(3);
    setIntroStatus("done");
    physRef.current.eruptLettersSplash();
    onIntroStateChange?.(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevX = physRef.current.lastPointerX;
    const prevY = physRef.current.lastPointerY;
    physRef.current.lastPointerX = x;
    physRef.current.lastPointerY = y;

    if (prevX !== null && prevY !== null) {
      const dy = y - prevY;
      const dx = x - prevX;
      const nodes = physRef.current.nodes;
      if (nodes.length > 0) {
        const idx = Math.max(
          1,
          Math.min(
            nodes.length - 2,
            Math.round((x / Math.max(1, rect.width)) * (nodes.length - 1))
          )
        );
        const waveY = nodes[idx].y;
        if (Math.abs(y - waveY) < 95) {
          const impulse = Math.max(-9, Math.min(9, dy * 0.25 + Math.abs(dx) * 0.08));
          nodes[idx].vy += impulse;
        }
        physRef.current.iceCubes.forEach((cube) => {
          const cx = cube.x * rect.width;
          if (Math.hypot(x - cx, y - cube.y) < cube.size * 0.85) {
            cube.vx += dx * 0.09;
            cube.vy += Math.max(-4, Math.min(5, dy * 0.14));
            cube.va += dx * 0.0015;
          }
        });
      }
    }
  };

  const handleHeroClick = async (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".hero-pill-dock") ||
      target.closest("button") ||
      target.closest(".cinema-gate-card")
    ) {
      return;
    }
    if (introStatus !== "done") {
      return;
    }
    const hero = heroRef.current;
    if (!hero) return;
    const rect = hero.getBoundingClientRect();
    physRef.current.dropSugarAt(e.clientX - rect.left, e.clientY - rect.top, 2, false, true);
    setCubesDropped((c) => c + 2);
  };

  const handleDropButton = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await soundEngine.unlock();
    const hero = heroRef.current;
    const w = hero?.clientWidth || window.innerWidth;
    physRef.current.dropSugarAt(w * (0.28 + Math.random() * 0.44), 60, 3, false, true);
    setCubesDropped((c) => c + 3);
  };

  const isIntroActive = introStatus !== "done";

  return (
    <section
      className={`hero brew-hero beat-${beat} ${
        impactFlash ? "is-impact-flash" : ""
      }`}
      id="hero"
      ref={heroRef}
      aria-label="Eksperimen interaktif takaran gula dan tumpukan tugas"
      onPointerMove={handlePointerMove}
      onClick={handleHeroClick}
    >
      {/* 2D Liquid Sugar, Pouring Streams, Shockwaves, Ice Cubes & Boba Canvas */}
      <canvas ref={canvasRef} className="brew-canvas" aria-hidden="true" />

      {/* =====================================================================
          CHOREOGRAPHED FULL-VIEWPORT KINETIC OPENING STAGE (Beats 0, 1, 2)
          ===================================================================== */}
      <div
        className={`cinema-intro ${isIntroActive ? "is-active" : "is-done"} ${
          introStatus === "waiting" ? "is-waiting" : ""
        }`}
        aria-hidden={!isIntroActive}
      >
        {/* Outer-Perimeter Task Cards: Frame the edges of the screen so they NEVER overlap the center text! */}
        {introStatus !== "waiting" && (
        <div className="cinema-tasks-layer">
          {PERIMETER_TASKS.map((t, i) => (
            <div
              key={i}
              className={`cinema-task-card ${beat >= 1 ? "is-blasted" : ""}`}
              style={{
                ...t.posStyle,
                ["--rot" as string]: t.rot,
                ["--bx" as string]: t.blastX,
                ["--by" as string]: t.blastY,
                ["--brot" as string]: t.blastRot,
                ["--delay" as string]: `${i * 125}ms`,
              }}
            >
              <span className="cinema-task-tag">{t.tag}</span>
              <span className="cinema-task-title">{t.title}</span>
            </div>
          ))}
        </div>
        )}

        {/* Outer-Corner Sweet Craving Pills in Beat 1 */}
        {beat === 1 && (
          <div className="cinema-cravings-layer">
            {CRAVING_PILLS.map((c, i) => (
              <span
                key={i}
                className="cinema-craving-pill"
                style={{
                  ...c.posStyle,
                  ["--cdelay" as string]: c.delay,
                }}
              >
                <i className="open-dot" />
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Center Full-Screen Editorial Kinetic Typography (Single-Line Enforced, Zero Overlap!) */}
        <div className="cinema-type-stage">
          {beat === 0 && introStatus !== "waiting" && (
            <div className="cinema-scene cinema-scene-0" key="beat0">
              <div className="cinema-clock-pill">
                <span className="cinema-clock-dot" />
                <span>TENGGAT WAKTU &middot; {clockText} WIB</span>
              </div>
              <p className="cinema-serif-lead">
                <span className="reveal-mask">
                  <span className="reveal-inner">Pernahkah kamu...</span>
                </span>
              </p>
              <h1 className="cinema-giant-display">
                <span className="reveal-mask">
                  <span className="reveal-inner is-delay-1">LAGI BANYAK</span>
                </span>
                <span className="reveal-mask">
                  <span className="reveal-inner is-delay-2 is-accent-stroke">
                    TUGAS KULIAH?
                  </span>
                </span>
              </h1>
            </div>
          )}

          {beat === 1 && (
            <div className="cinema-scene cinema-scene-1" key="beat1">
              <div className="cinema-clock-pill is-sweet">
                <i className="open-dot" />
                <span>PELARIAN MANIS &middot; SUGAR RUSH</span>
              </div>
              <p className="cinema-serif-lead">
                <span className="reveal-mask">
                  <span className="reveal-inner">
                    ...lalu tiba-tiba mencari
                  </span>
                </span>
              </p>
              <h1 className="cinema-giant-display">
                <span className="reveal-mask">
                  <span className="reveal-inner is-delay-1 is-caramel-glow">
                    KONSUMSI GULA?
                  </span>
                </span>
              </h1>
            </div>
          )}

          {beat === 2 && (
            <div className="cinema-scene cinema-scene-2" key="beat2">
              <div className="cinema-invite-card">
                <div className="cinema-clock-pill">
                  <i className="open-dot" />
                  <span>TUGAS METODE PENELITIAN KUANTITATIF S1 PSIKOLOGI UGM</span>
                </div>
                <h2 className="cinema-invite-headline">
                  Mari bantu kami dengan{" "}
                  <em>mengisi kuesioner ini.</em>
                </h2>
              </div>
            </div>
          )}
        </div>

        {/* Minimal Intro Timeline: progress + skip (audio controls removed) */}
        {introStatus === "playing" && (
          <div className="cinema-bottom-bar">
            <div className="cinema-progress-track">
              <div
                className="cinema-progress-fill"
                key={`${replayTrigger}-${timelineKey}`}
              />
            </div>
            <button
              type="button"
              className="story-skip-pill"
              onClick={handleSkipIntro}
            >
              <span>Lewati</span>
              <ArrowRight size={13} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          START SPLASH: one single "Mulai" button that unlocks audio & plays intro
          ===================================================================== */}
      {splashPhase !== "gone" && (
        <div
          className={`start-splash ${splashPhase === "leaving" ? "is-leaving" : ""}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Mulai pengalaman kuesioner"
        >
          <div className="start-splash-glow" aria-hidden="true" />
          <div className="start-splash-grain" aria-hidden="true" />
          <span className="start-cube start-cube-a" aria-hidden="true" />
          <span className="start-cube start-cube-b" aria-hidden="true" />
          <span className="start-cube start-cube-c" aria-hidden="true" />

          <div className="start-splash-inner">
            <span className="start-kicker">
              <i className="open-dot" aria-hidden="true" />
              Tugas Metode Penelitian Kuantitatif &middot; Psikologi UGM
            </span>

            <h1 className="start-title">
              Takaran<em>.</em>
            </h1>

            <p className="start-sub">
              Sebuah cerita singkat tentang tumpukan tugas kuliah
              <br />
              dan segelas manis gula aren.
            </p>

            <button
              type="button"
              className="start-orb"
              onClick={handleBegin}
              autoFocus
              aria-label="Mulai"
            >
              <span className="start-orb-ring" aria-hidden="true" />
              <span className="start-orb-ring is-late" aria-hidden="true" />
              <span className="start-orb-core">
                <span className="start-orb-liquid" aria-hidden="true" />
                <span className="start-orb-label">
                  <Play size={18} weight="fill" />
                  <span>Mulai</span>
                </span>
              </span>
            </button>

            <span className="start-hint">
              <Headphones size={14} weight="bold" />
              Nyalakan suara untuk pengalaman terbaik
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          SETTLED HERO STAGE (Beat 3): Monument Word Clipped Cleanly at Baseline!
          ===================================================================== */}
      <div
        className={`monument ${beat === 3 ? "is-up" : ""}`}
        aria-hidden="true"
      >
        <div className="monument-kicker">
          <span>TUGAS METODE PENELITIAN KUANTITATIF S1 PSIKOLOGI UGM</span>
          <span>&bull;</span>
          <span>{cubesDropped} GULA BATU LARUT</span>
        </div>
        <div className="monument-word">
          {"TAKARAN".split("").map((ch, idx) => (
            <span className="ch" style={{ ["--i" as string]: idx }} key={idx}>
              {ch}
            </span>
          ))}
        </div>
        <p className="monument-sub">
          Pernahkah kamu mengonsumsi gula saat lagi banyak tugas? Mari bantu
          kami dengan mengisi kuesioner ini.
        </p>
      </div>

      {/* Compact Floating Pill Bar at Bottom */}
      <div
        className={`hero-pill-dock ${
          isIntroActive ? "is-hidden-intro" : ""
        }`}
      >
        <div className="hero-pill-bar" role="toolbar" aria-label="Aksi utama kuesioner">
          <button
            type="button"
            className="pill-action-primary"
            onClick={async () => {
              await soundEngine.unlock();
              soundEngine.playIceClink();
              onStartClick();
            }}
          >
            <i className="open-dot" aria-hidden="true" />
            <span>Mulai Isi Kuesioner</span>
          </button>

          <button
            type="button"
            className="pill-action-ghost"
            onClick={handleDropButton}
            title="Jatuhkan gula batu ke dalam gelas"
          >
            <Plus size={15} weight="bold" />
            <span>Jatuhkan Gula</span>
          </button>

          <button
            type="button"
            className="pill-action-ghost"
            onClick={async (e) => {
              e.stopPropagation();
              await soundEngine.unlock();
              soundEngine.playIceClink();
              onToggleNightMode();
            }}
            title="Ganti suasana Siang / Kopi Lembur"
          >
            {isNightMode ? (
              <>
                <Sun size={15} weight="bold" />
                <span>Mode Siang</span>
              </>
            ) : (
              <>
                <Moon size={15} weight="bold" />
                <span>Mode Lembur</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="pill-action-ghost"
            onClick={async (e) => {
              e.stopPropagation();
              await soundEngine.unlock();
              onReplayIntro();
            }}
            title="Putar ulang animasi pembuka dengan efek suara"
          >
            <ArrowsClockwise size={15} weight="bold" />
            <span>Putar Intro</span>
          </button>
        </div>
      </div>
    </section>
  );
};
