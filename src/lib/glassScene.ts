// Canvas scene for the beranda: a gelas belimbing of es teh on the study desk.
// Each task drops one sugar cube that tumbles in, sinks and settles on a pile at
// the bottom, so the sugar piles up exactly as the tasks do.
//
// Everything is simulated in glass units: 1 unit is the outer width of the rim
// and the origin sits at the centre of the rim. The glass can then glide and
// resize between its intro and home slots without disturbing the simulation.
//
// It is drawn like a printed illustration, always lit from the left (a window by
// day, a desk lamp at night): thin ink lines and flat tones rather than soft
// gradients. Nothing is a blob: the glass has facets, the ice is broken off a
// block of es balok and the sugar comes in cubes. The light itself is the one
// soft thing, and it is drawn on its own layer under the glass.

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GlassView {
  cx: number;
  top: number;
  u: number;
}

interface SceneOptions {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  measure: () => { intro: Slot; home: Slot } | null;
  follower?: HTMLElement | null; // kept centred under the glass (its caption)
  night: boolean;
  reduceMotion: boolean;
  onSplash?: () => void;
}

export interface GlassScene {
  view: () => GlassView;
  pileX: (i: number) => number;
  dropTaskCube: (i: number) => void;
  dropCube: (clientX?: number) => void;
  settle: () => void;
  glideHome: (ms: number) => void;
  jumpHome: () => void;
  setNight: (night: boolean) => void;
  destroy: () => void;
}

// ---- geometry, in glass units ---------------------------------------------
const H = 1.3; // rim to the underside of the base
const R_TOP = 0.5;
const R_BOT = 0.385;
const WALL = 0.022;
const BAND = 0.13; // plain band under the rim; the facet arches start here
const RIDGE = 0.2; // where the ridges between two arches begin
const FLOOR = 1.165; // inside bottom, on top of the thick base
const LEVEL = 0.3; // tea surface at rest, a little under the arches
const K = 0.1; // we look slightly down, so circles read as flat ellipses
const FACETS = 12;
const CUBE = 0.155;
const HEAD = 0.4; // room above the rim for the straw
export const CAPTION = 34; // px kept free under the glass for its caption
const MAX_U = 440;
const CAM = -0.36; // camera pitch for the cubes, so their top face shows
const N = 40; // surface spring nodes

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number[], b: number[], t: number) =>
  `${lerp(a[0], b[0], t) | 0}, ${lerp(a[1], b[1], t) | 0}, ${lerp(a[2], b[2], t) | 0}`;

const rad = (y: number) => R_TOP + (R_BOT - R_TOP) * (y / H);
const inner = (y: number) => rad(y) - WALL;

// A point on the outside of the glass at angle th (0 faces the viewer)
const onGlass = (th: number, y: number): [number, number] => {
  const r = rad(y);
  return [r * Math.sin(th), y + r * K * Math.cos(th)];
};

// Light comes from the upper left; this points towards it
const LIGHT_2D: [number, number] = [-0.6, -0.8];

// The six task cubes come to rest as three, then two, then one. The order
// goes left, right, left, ... so the intro's task slips can alternate sides
const restY = (row: number) => FLOOR - CUBE * 0.47 - row * CUBE * 0.94;
const PILE = [
  { x: -0.208, row: 0, yaw: 0.1, roll: 0.03 },
  { x: 0.21, row: 0, yaw: -0.12, roll: -0.04 },
  { x: 0.002, row: 0, yaw: 0.04, roll: 0.01 },
  { x: 0.107, row: 1, yaw: 0.11, roll: -0.03 },
  { x: -0.098, row: 1, yaw: -0.14, roll: 0.05 },
  { x: 0.004, row: 2, yaw: -0.06, roll: 0.06 },
];
const REST_YAW = -0.3;

// Plastic straw leaning in the glass: foot in the sugar, mouth over the rim
const STRAW_B: [number, number] = [0.1, 1.08];
const STRAW_E: [number, number] = [0.45, -0.37];
const STRAW_W = 0.05;

const seeded = (seed: number) => {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};

interface Cube {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rx: number;
  ry: number;
  rz: number;
  wx: number;
  wy: number;
  wz: number;
  tx: number;
  ty: number;
  yaw: number;
  roll: number;
  stage: 0 | 1 | 2; // in the air, sinking, resting
  extra: boolean; // dropped by a tap: dissolves once it lands
  life: number;
}

type P2 = [number, number];

// A chunk broken off a block of es balok: straight fracture edges, a few
// faces meeting at the corner nearest the light, and a milky core of frozen air
interface Chunk {
  pts: P2[];
  apex: P2;
  faces: { idx: number[]; dir: P2 }[];
  core: P2[];
  streaks: [P2, P2][];
  bubbles: [number, number, number][];
}

interface Ice {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  s: number;
  tilt: number; // angle it settles at
  draft: number; // centre's height over the surface, in sizes (negative: below)
  deep: boolean; // held under by the ice above, so only seen through the tea
  home: number; // where it drifts back to after a stir
  shape: Chunk;
}

interface Speck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  max: number;
  a: number;
}

interface Dew {
  th: number;
  y: number;
  r: number;
  run: number; // length of the clear trail above a drop that ran down
}

// Dust drifting in the lamp's beam: t runs along the beam, s across it
interface Mote {
  t: number;
  s: number;
  vt: number;
  vs: number;
  r: number;
  ph: number;
  f: number;
}

// ---- light ------------------------------------------------------------------
// Day: sun through a window on the left lays bright panes on the wall. Night:
// a desk lamp up on the left pools warm light around the glass. Either way the
// glass throws its shadow on the wall beside it, and the tea gathers the light
// passing through it into an amber caustic inside that shadow.
const LS = 1 / 7; // light is drawn this small and scaled up: the upscale is the penumbra
const SHADOW: [number, number] = [0.44, 0]; // where the glass's shadow falls, from the glass
const SHEAR = 0.3; // the window panes lean as the sun comes in from above
const PANE_X = 0.24;
// Panes before the shear: x0, x1, y0, y1
const PANES: [number, number, number, number][] = [
  [-0.3, 0.38, -0.95, 0.1],
  [0.44, 1.12, -0.95, 0.1],
  [-0.3, 0.38, 0.16, 1.32],
  [0.44, 1.12, 0.16, 1.32],
];
const LAMP: [number, number] = [-2.5, -2.2];
const AIM: [number, number] = [0.02, 0.5];
const BEAM = 0.2; // half the beam's width per unit of length

const chunk = (seed: number): Chunk => {
  const rnd = seeded(seed);
  rnd();
  const n = 5 + Math.floor(rnd() * 3);
  const start = rnd() * TAU;
  const wide = 1 + rnd() * 0.28;
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + ((i + (rnd() - 0.5) * 0.6) / n) * TAU;
    const r = 0.36 + rnd() * 0.2;
    pts.push([Math.cos(a) * r * wide, Math.sin(a) * r * 0.84]);
  }
  const apex: P2 = [-0.1 + (rnd() - 0.5) * 0.12, -0.1 + (rnd() - 0.5) * 0.08];
  const links: number[] = [];
  for (let i = 0; i < n; i += 2) links.push(i);
  const faces = links.map((from, k) => {
    const to = links[(k + 1) % links.length];
    const idx: number[] = [];
    for (let i = from; ; i = (i + 1) % n) {
      idx.push(i);
      if (i === to) break;
    }
    let cx = apex[0];
    let cy = apex[1];
    idx.forEach((i) => {
      cx += pts[i][0];
      cy += pts[i][1];
    });
    cx = cx / (idx.length + 1) - apex[0];
    cy = cy / (idx.length + 1) - apex[1];
    const d = Math.hypot(cx, cy) || 1;
    return { idx, dir: [cx / d, cy / d] as P2 };
  });
  // The cloudy core is ragged rather than round, with feathers of trapped air
  // running out of it
  const core: P2[] = [];
  const ccx = 0.05 + (rnd() - 0.5) * 0.08;
  const ccy = 0.07 + (rnd() - 0.5) * 0.06;
  for (let i = 0; i < 9; i++) {
    const a = ((i + (rnd() - 0.5) * 0.5) / 9) * TAU;
    const r = 0.1 + rnd() * 0.09;
    core.push([ccx + Math.cos(a) * r * wide, ccy + Math.sin(a) * r * 0.7]);
  }
  const streaks: [P2, P2][] = [];
  for (let i = 0; i < 3; i++) {
    const a = rnd() * TAU;
    const r0 = 0.08 + rnd() * 0.05;
    const r1 = r0 + 0.08 + rnd() * 0.1;
    streaks.push([
      [ccx + Math.cos(a) * r0, ccy + Math.sin(a) * r0 * 0.7],
      [ccx + Math.cos(a) * r1, ccy + Math.sin(a) * r1 * 0.7],
    ]);
  }
  const bubbles: [number, number, number][] = [];
  for (let i = 0; i < 3; i++) {
    bubbles.push([ccx + (rnd() - 0.5) * 0.4, ccy + (rnd() - 0.5) * 0.28, 0.01 + rnd() * 0.012]);
  }
  return { pts, apex, faces, core, streaks, bubbles };
};

// Condensation on the cold part of the glass, under the level of the tea
const DEW: Dew[] = (() => {
  const rnd = seeded(101);
  const out: Dew[] = [];
  for (let i = 0; i < 150; i++) {
    const th = (rnd() - 0.5) * 2.9;
    const y = LEVEL + 0.05 + rnd() * (H - LEVEL - 0.13);
    const kind = rnd();
    const r = kind < 0.62 ? 0.0028 : kind < 0.9 ? 0.005 + rnd() * 0.006 : 0.011 + rnd() * 0.008;
    out.push({ th, y, r, run: r > 0.011 && rnd() < 0.45 ? 0.07 + rnd() * 0.16 : 0 });
  }
  return out;
})();

// Granular sugar texture, mapped onto every face of every cube
const makeGrain = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (!g) return c;
  const rnd = seeded(7);
  // Neutral white, a touch warmer than the ice so the two read apart
  g.fillStyle = "#f7f6f2";
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 760; i++) {
    const x = rnd() * 64;
    const y = rnd() * 64;
    const t = rnd();
    g.fillStyle =
      t < 0.46
        ? "rgba(255, 255, 255, 0.95)"
        : t < 0.8
        ? "rgba(226, 224, 220, 0.75)"
        : "rgba(200, 198, 195, 0.6)";
    const s = rnd() < 0.8 ? 1 : 2;
    g.fillRect(x, y, s, s);
  }
  // Edges catch the light; a few crumbs are missing along them
  g.strokeStyle = "rgba(255, 255, 255, 0.92)";
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 61, 61);
  for (let i = 0; i < 10; i++) {
    const along = rnd() * 60 + 2;
    const side = Math.floor(rnd() * 4);
    const x = side === 0 ? along : side === 1 ? 62 : side === 2 ? along : 1;
    const y = side === 0 ? 1 : side === 1 ? along : side === 2 ? 62 : along;
    g.fillStyle = "rgba(188, 186, 183, 0.7)";
    g.fillRect(x - 1, y - 1, 2 + rnd() * 2, 2 + rnd() * 2);
  }
  return c;
};

type V3 = [number, number, number];
type M3 = [number, number, number, number, number, number, number, number, number];

const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const rotX = (t: number): M3 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const rotY = (t: number): M3 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
const rotZ = (t: number): M3 => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
const apply = (m: M3, v: V3): V3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

// Cube corners (index bits: x, y, z) and faces with their outward normals.
// Screen axes: x right, y down, z towards the viewer.
const CORNERS: V3[] = Array.from({ length: 8 }, (_, i) => [
  i & 1 ? 1 : -1,
  i & 2 ? 1 : -1,
  i & 4 ? 1 : -1,
]);
const FACES: { n: V3; v: [number, number, number, number] }[] = [
  { n: [1, 0, 0], v: [1, 3, 7, 5] },
  { n: [-1, 0, 0], v: [0, 4, 6, 2] },
  { n: [0, 1, 0], v: [2, 6, 7, 3] },
  { n: [0, -1, 0], v: [0, 1, 5, 4] },
  { n: [0, 0, 1], v: [4, 5, 7, 6] },
  { n: [0, 0, -1], v: [0, 2, 3, 1] },
];
const LIGHT: V3 = (() => {
  const l: V3 = [-0.5, -0.65, 0.75];
  const m = Math.hypot(...l);
  return [l[0] / m, l[1] / m, l[2] / m];
})();
const CAM_M = rotX(CAM);

const snapTo = (a: number, rest: number) =>
  rest + Math.round((a - rest) / (Math.PI / 2)) * (Math.PI / 2);

export const createGlassScene = (opts: SceneOptions): GlassScene => {
  const { host, canvas, follower, reduceMotion } = opts;
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) throw new Error("Canvas 2D tidak tersedia");
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  let night = opts.night;
  const grain = makeGrain();

  // ---- state -----------------------------------------------------------------
  const hs = new Float32Array(N);
  const vs = new Float32Array(N);
  const span = inner(LEVEL);
  const nodeX = (i: number) => -span + (i / (N - 1)) * span * 2;

  // For a held-under chunk, draft is how deep its centre sits, in sizes
  const block = (x: number, s: number, tilt: number, draft: number, deep: boolean, seed: number): Ice => ({
    x,
    y: deep ? LEVEL + s * draft : LEVEL - s * draft,
    vx: 0,
    vy: 0,
    a: tilt,
    va: 0,
    s,
    tilt,
    draft,
    deep,
    home: x,
    shape: chunk(seed),
  });
  // Held-under chunks first so the floating ones are drawn over them
  const ice: Ice[] = [
    block(-0.24, 0.2, 0.55, 1.05, true, 61),
    block(0.03, 0.18, -0.3, 1.5, true, 23),
    block(0.22, 0.19, -0.5, 0.95, true, 97),
    block(-0.33, 0.19, -0.42, 0.1, false, 11),
    block(-0.14, 0.27, 0.16, 0.0, false, 29),
    block(0.1, 0.2, 0.62, 0.12, false, 47),
    block(0.3, 0.22, -0.18, 0.04, false, 83),
  ];

  const cubes: Cube[] = [];
  const grains: Speck[] = [];
  const drops: Speck[] = [];
  const rings: Ring[] = [];
  let sediment = 0;

  const motes: Mote[] = (() => {
    const rnd = seeded(331);
    return Array.from({ length: 64 }, () => ({
      t: 0.3 + rnd() * 0.75,
      s: (rnd() - 0.5) * 1.8,
      vt: (rnd() - 0.5) * 0.0005,
      vs: (rnd() - 0.5) * 0.002,
      r: 0.6 + rnd() * 1.5,
      ph: rnd() * TAU,
      f: 0.0006 + rnd() * 0.0016,
    }));
  })();
  const beam = (() => {
    const ex = AIM[0] - LAMP[0];
    const ey = AIM[1] - LAMP[1];
    const len = Math.hypot(ex, ey);
    return { len, dx: ex / len, dy: ey / len };
  })();

  const light = document.createElement("canvas");
  const lctx = light.getContext("2d");
  let lightKey = "";
  let lightAge = 0;

  let W = 0;
  let Hpx = 0;
  let dpr = 1;
  let slots: { intro: Slot; home: Slot } = {
    intro: { x: 0, y: 0, w: 1, h: 1 },
    home: { x: 0, y: 0, w: 1, h: 1 },
  };
  let morph = 0;
  let glide: { from: number; start: number; dur: number } | null = null;
  let lastDesk = -1;

  const fit = (s: Slot): GlassView => {
    const u = Math.max(40, Math.min((s.h - CAPTION) / (H + HEAD), s.w * 0.84, MAX_U));
    return { cx: s.x + s.w / 2, top: s.y + s.h - CAPTION - H * u, u };
  };

  const view = (): GlassView => {
    const a = fit(slots.intro);
    const b = fit(slots.home);
    return { cx: lerp(a.cx, b.cx, morph), top: lerp(a.top, b.top, morph), u: lerp(a.u, b.u, morph) };
  };

  // ---- liquid surface ----------------------------------------------------------
  const surfAt = (x: number) => {
    const f = clamp((x + span) / (span * 2), 0, 1) * (N - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(N - 1, i0 + 1);
    const t = f - i0;
    const step = (span * 2) / (N - 1);
    return { y: LEVEL + hs[i0] + (hs[i1] - hs[i0]) * t, slope: (hs[i1] - hs[i0]) / step };
  };

  const kick = (x: number, impulse: number, spread = 4) => {
    const idx = Math.round(clamp((x + span) / (span * 2), 0, 1) * (N - 1));
    for (let i = Math.max(1, idx - spread); i <= Math.min(N - 2, idx + spread); i++) {
      const d = Math.abs(i - idx);
      vs[i] += impulse * Math.cos((d / (spread + 1)) * (Math.PI / 2));
    }
  };

  const restingCube = (i: number): Cube => {
    const p = PILE[i];
    return {
      x: p.x,
      y: restY(p.row),
      vx: 0,
      vy: 0,
      rx: 0,
      ry: REST_YAW + p.yaw,
      rz: p.roll,
      wx: 0,
      wy: 0,
      wz: 0,
      tx: p.x,
      ty: restY(p.row),
      yaw: REST_YAW + p.yaw,
      roll: p.roll,
      stage: 2,
      extra: false,
      life: 1,
    };
  };

  const launch = (x: number, y: number, vy: number, tx: number, ty: number, yaw: number, roll: number, extra: boolean): Cube => ({
    x,
    y,
    vx: 0,
    vy,
    rx: Math.random() * TAU,
    ry: Math.random() * TAU,
    rz: Math.random() * TAU,
    wx: (Math.random() - 0.5) * 0.22,
    wy: (Math.random() - 0.5) * 0.22,
    wz: (Math.random() - 0.5) * 0.16,
    tx,
    ty,
    yaw,
    roll,
    stage: 0,
    extra,
    life: 1,
  });

  const splash = (c: Cube, wy: number) => {
    const power = clamp(c.vy / 0.024, 0.45, 1.5);
    kick(c.x, 0.026 * power + 0.008);
    rings.push({ x: c.x, y: wy, r: CUBE * 0.3, max: 0.2 * power + 0.08, a: 0.75 });
    const count = Math.round(9 + 9 * power);
    for (let d = 0; d < count; d++) {
      drops.push({
        x: c.x + (Math.random() - 0.5) * CUBE * 0.8,
        y: wy,
        vx: (Math.random() - 0.5) * 0.011 * power,
        vy: -(0.005 + Math.random() * 0.011) * power,
        r: 0.0035 + Math.random() * 0.0055,
        a: 1,
      });
    }
    for (let d = 0; d < 14; d++) {
      grains.push({
        x: c.x + (Math.random() - 0.5) * CUBE,
        y: wy + CUBE * 0.4 + Math.random() * CUBE * 0.4,
        vx: (Math.random() - 0.5) * 0.0016,
        vy: 0.0018 + Math.random() * 0.003,
        r: 0.0022 + Math.random() * 0.0022,
        a: 0.95,
      });
    }
    // The ice above the splash gets shoved aside
    ice.forEach((b) => {
      const d = b.x - c.x;
      if (Math.abs(d) < b.s * 1.1) {
        b.vx += Math.sign(d || 1) * 0.0035 * power;
        b.va += Math.sign(d || 1) * 0.012 * power;
        if (!b.deep) b.vy += 0.004 * power;
      }
    });
    opts.onSplash?.();
  };

  // ---- simulation --------------------------------------------------------------
  // Highest resting surface under x, so tapped sugar sits on the pile
  // instead of sinking through it
  const pileTop = (x: number, half: number) => {
    let top = FLOOR;
    for (const p of cubes) {
      if (p.extra || Math.abs(p.tx - x) > CUBE * 0.5 + half * 0.7) continue;
      top = Math.min(top, p.ty - CUBE * 0.47);
    }
    return top;
  };

  // Extra sugar from a tap crumbles into grains as it sinks and finishes
  // dissolving on top of the pile, so the pile itself never grows
  const crumble = (c: Cube, rate: number) => {
    c.life -= rate;
    if (Math.random() < 0.45) {
      grains.push({
        x: c.x + (Math.random() - 0.5) * CUBE * c.life,
        y: c.y + CUBE * 0.3 * c.life,
        vx: (Math.random() - 0.5) * 0.0014,
        vy: 0.002 + Math.random() * 0.0025,
        r: 0.002 + Math.random() * 0.002,
        a: 0.9,
      });
    }
    return c.life <= 0.06;
  };

  const update = (now: number) => {
    if (glide) {
      const p = clamp((now - glide.start) / glide.dur, 0, 1);
      morph = lerp(glide.from, 1, ease(p));
      if (p >= 1) glide = null;
    }

    const amp = reduceMotion ? 0 : 0.0042;
    for (let i = 0; i < N; i++) {
      const swell = Math.sin(now * 0.0019 + i * 0.32) * amp + Math.cos(now * 0.0011 - i * 0.2) * amp * 0.55;
      vs[i] = (vs[i] + (swell - hs[i]) * 0.03) * 0.9;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        if (i > 0) vs[i - 1] += 0.18 * (hs[i] - hs[i - 1]);
        if (i < N - 1) vs[i + 1] += 0.18 * (hs[i] - hs[i + 1]);
      }
      for (let i = 0; i < N; i++) hs[i] += vs[i];
    }

    // Floating ice rides the surface; the chunks under it bob in place
    ice.forEach((c, idx) => {
      if (c.deep) {
        const bob = reduceMotion ? 0 : Math.sin(now * 0.0012 + idx * 2.1) * 0.005;
        c.vy = (c.vy + (LEVEL + c.s * c.draft + bob - c.y) * 0.02) * 0.86;
        c.va = (c.va + (c.tilt - c.a) * 0.02) * 0.88;
      } else {
        const { y: wy, slope } = surfAt(c.x);
        const sub = c.y + c.s * c.draft - wy;
        if (sub > 0) {
          c.vy -= Math.min(sub, c.s * 1.2) * 0.02;
          c.vy *= 0.87;
          c.va += (slope * 0.5 + c.tilt - c.a) * 0.03;
          c.va *= 0.86;
          if (!reduceMotion) c.x += Math.sin(now * 0.0007 + idx * 1.7) * 0.00012;
        } else {
          c.vy += 0.0009;
          c.vy *= 0.985;
        }
      }
      c.vx = (c.vx + (c.home - c.x) * 0.0012) * 0.94;
      c.x += c.vx;
      c.y += c.vy;
      c.a += c.va;
      const lim = inner(Math.max(c.y, 0)) - c.s * 0.5;
      if (c.x < -lim) {
        c.x = -lim;
        c.vx = Math.abs(c.vx) * 0.3;
      }
      if (c.x > lim) {
        c.x = lim;
        c.vx = -Math.abs(c.vx) * 0.3;
      }
    });
    for (let a = 0; a < ice.length; a++) {
      for (let b = a + 1; b < ice.length; b++) {
        const A = ice[a];
        const B = ice[b];
        if (A.deep !== B.deep) continue;
        const minD = (A.s + B.s) * 0.5 * 0.74;
        const dx = A.x - B.x;
        if (Math.abs(dx) < minD && Math.abs(A.y - B.y) < minD) {
          const push = (minD - Math.abs(dx)) * 0.25 * (dx >= 0 ? 1 : -1);
          A.x += push;
          B.x -= push;
        }
      }
    }

    // Sugar: tumble through the air, splash, sink and settle on the pile
    for (let i = cubes.length - 1; i >= 0; i--) {
      const c = cubes[i];
      if (c.stage === 0) {
        c.vy += 0.0011;
        c.vx += (c.tx - c.x) * 0.004;
        c.x += c.vx;
        c.y += c.vy;
        c.rx += c.wx;
        c.ry += c.wy;
        c.rz += c.wz;
        const wy = surfAt(c.x).y;
        if (c.y + CUBE * 0.3 >= wy) {
          splash(c, wy);
          c.stage = 1;
        }
      } else if (c.stage === 1) {
        if (c.extra && crumble(c, 0.016)) {
          cubes.splice(i, 1);
          sediment = Math.min(0.05, sediment + 0.004);
          continue;
        }
        c.vy = c.vy * 0.9 + (c.extra ? 0.00045 : 0.0022);
        c.vx = (c.vx + (c.tx - c.x) * 0.02) * 0.86;
        c.x += c.vx;
        c.y += c.vy;
        c.wx *= 0.92;
        c.wy *= 0.92;
        c.wz *= 0.92;
        c.rx += c.wx;
        c.ry += c.wy;
        c.rz += c.wz;
        const near = clamp((c.y - LEVEL) / Math.max(0.01, c.ty - LEVEL), 0, 1);
        const pull = 0.015 + 0.12 * near * near;
        c.rx += (snapTo(c.rx, 0) - c.rx) * pull;
        c.ry += (snapTo(c.ry, c.yaw) - c.ry) * pull;
        c.rz += (snapTo(c.rz, c.roll) - c.rz) * pull;
        if (c.extra) {
          const half = (CUBE / 2) * (0.35 + 0.65 * c.life);
          const rest = pileTop(c.x, half) - half * 0.94;
          if (c.y > rest) {
            c.y = rest;
            c.vy = 0;
          }
        } else if (c.y >= c.ty) {
          c.y = c.ty;
          c.vy = 0;
          c.stage = 2;
          kick(c.x, 0.002, 2);
        }
      } else {
        c.x += (c.tx - c.x) * 0.2;
        c.rx += (snapTo(c.rx, 0) - c.rx) * 0.2;
        c.ry += (snapTo(c.ry, c.yaw) - c.ry) * 0.2;
        c.rz += (snapTo(c.rz, c.roll) - c.rz) * 0.2;
      }
    }

    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i];
      g.x += g.vx;
      g.y += g.vy;
      g.vx *= 0.985;
      g.a -= 0.008;
      if (g.a <= 0 || g.y > FLOOR) grains.splice(i, 1);
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.0009;
      d.a -= 0.024;
      if (d.a <= 0) drops.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += (r.max - r.r) * 0.1 + 0.002;
      r.a *= 0.92;
      if (r.a <= 0.02) rings.splice(i, 1);
    }

    if (night && !reduceMotion) {
      motes.forEach((m) => {
        m.vs = (m.vs + (Math.random() - 0.5) * 0.0004) * 0.985;
        m.s += m.vs;
        m.t += m.vt;
        if (m.s > 0.95 || m.s < -0.95) m.vs = -m.vs;
        if (m.t > 1.08) m.t = 0.3;
        if (m.t < 0.3) m.t = 1.08;
      });
    }
  };

  // ---- drawing helpers ---------------------------------------------------------
  let px = 1; // one device-independent pixel, in glass units

  const pathSilhouette = () => {
    ctx.beginPath();
    ctx.moveTo(-R_TOP, 0);
    ctx.lineTo(-R_BOT, H);
    for (let s = 1; s < 18; s++) {
      const [x, y] = onGlass(-Math.PI / 2 + (Math.PI * s) / 18, H);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(R_BOT, H);
    ctx.lineTo(R_TOP, 0);
    for (let s = 1; s < 18; s++) {
      const [x, y] = onGlass(Math.PI / 2 - (Math.PI * s) / 18, 0);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Inside of the glass, left open above the rim so sugar can fall in
  const pathInterior = () => {
    const t = inner(0);
    const b = inner(FLOOR);
    ctx.beginPath();
    ctx.moveTo(-t, -3);
    ctx.lineTo(t, -3);
    ctx.lineTo(t, 0);
    ctx.lineTo(b, FLOOR);
    for (let s = 1; s < 18; s++) {
      const th = Math.PI / 2 - (Math.PI * s) / 18;
      ctx.lineTo(b * Math.sin(th), FLOOR + b * K * Math.cos(th));
    }
    ctx.lineTo(-b, FLOOR);
    ctx.lineTo(-t, 0);
    ctx.closePath();
  };

  const waterPoint = (i: number, side: 1 | -1): [number, number] => {
    const x = nodeX(i);
    return [x, LEVEL + hs[i] + side * K * Math.sqrt(Math.max(0, span * span - x * x))];
  };

  // Smooth curve through the surface nodes, front (1) or back (-1) edge
  const traceWater = (side: 1 | -1, reverse: boolean, move: boolean) => {
    let lx = 0;
    let ly = 0;
    for (let k = 0; k < N; k++) {
      const i = reverse ? N - 1 - k : k;
      const [x, y] = waterPoint(i, side);
      if (k === 0) {
        if (move) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      } else {
        ctx.quadraticCurveTo(lx, ly, (lx + x) / 2, (ly + y) / 2);
      }
      lx = x;
      ly = y;
    }
    ctx.lineTo(lx, ly);
  };

  // Everything above the near edge of the tea, or everything under it
  const clipAboveTea = () => {
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, waterPoint(N - 1, 1)[1]);
    traceWater(1, true, false);
    ctx.lineTo(-2, waterPoint(0, 1)[1]);
    ctx.closePath();
    ctx.clip();
  };

  const clipUnderTea = () => {
    ctx.beginPath();
    ctx.moveTo(-2, waterPoint(0, 1)[1]);
    traceWater(1, false, false);
    ctx.lineTo(2, waterPoint(N - 1, 1)[1]);
    ctx.lineTo(2, 3);
    ctx.lineTo(-2, 3);
    ctx.closePath();
    ctx.clip();
  };

  // Seen through the tea, sugar takes on its colour: more so the deeper it sits
  const teaTint = (y: number) => {
    const t = clamp((y - LEVEL) / (FLOOR - LEVEL), 0, 1);
    const [r, g, b] = night
      ? [lerp(244, 226, t), lerp(176, 132, t), lerp(100, 70, t)]
      : [lerp(250, 242, t), lerp(208, 178, t), lerp(150, 112, t)];
    return `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${lerp(0.12, night ? 0.36 : 0.24, t)})`;
  };

  const drawCube = (c: Cube) => {
    const h = (CUBE / 2) * (c.extra ? 0.35 + 0.65 * c.life : 1);
    const m = mul(CAM_M, mul(rotY(c.ry), mul(rotX(c.rx), rotZ(c.rz))));
    const p = CORNERS.map((v) => {
      const r = apply(m, [v[0] * h, v[1] * h, v[2] * h]);
      return [c.x + r[0], c.y + r[1]] as [number, number];
    });
    const alpha = c.extra ? clamp(c.life * 1.6, 0, 1) : 1;
    const tint = c.stage > 0 ? teaTint(c.y) : null;
    // Sugar scatters light inside, so its shadowed faces stay fairly light
    const shadow = tint ? (night ? "70, 26, 8" : "120, 64, 30") : night ? "18, 24, 56" : "92, 97, 110";
    const depth = tint ? 0.55 : 0.6;
    const edge = tint
      ? night
        ? "rgba(60, 20, 4, 0.5)"
        : "rgba(120, 52, 16, 0.42)"
      : night
      ? "rgba(40, 48, 90, 0.5)"
      : "rgba(40, 50, 90, 0.38)";
    ctx.save();
    ctx.globalAlpha = alpha;
    FACES.forEach((f) => {
      const n = apply(m, f.n);
      if (n[2] <= 0.002) return;
      const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
      const shade = (1 - (0.42 + 0.58 * lit)) * depth;
      const [a, b, cc, d] = f.v.map((k) => p[k]);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(cc[0], cc[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fillStyle = "#efeee9";
      ctx.fill();
      ctx.lineWidth = px * 0.8;
      ctx.strokeStyle = "#efeee9";
      ctx.stroke();
      ctx.clip();
      ctx.transform(b[0] - a[0], b[1] - a[1], d[0] - a[0], d[1] - a[1], a[0], a[1]);
      ctx.drawImage(grain, 0, 0, 1, 1);
      ctx.fillStyle = `rgba(${shadow}, ${shade})`;
      ctx.fillRect(0, 0, 1, 1);
      if (tint) {
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, 1, 1);
      }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(cc[0], cc[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.lineWidth = px;
      ctx.lineJoin = "round";
      ctx.strokeStyle = edge;
      ctx.stroke();
    });
    ctx.restore();
  };

  // A bright line with a halo, for highlights the lamp catches at night: wide
  // faint strokes under a thin bright one read as glow at a fraction of the
  // cost of a shadow blur. unit is one pixel in the current transform.
  const glowStroke = (unit: number, width: number) => {
    ctx.lineWidth = unit * width * 5;
    ctx.strokeStyle = "rgba(255, 170, 90, 0.1)";
    ctx.stroke();
    ctx.lineWidth = unit * width * 2.4;
    ctx.strokeStyle = "rgba(255, 190, 120, 0.2)";
    ctx.stroke();
    ctx.lineWidth = unit * width;
    ctx.strokeStyle = "rgba(255, 228, 186, 0.92)";
    ctx.stroke();
  };

  // Ice: faces in flat tones by how they turn to the light, white edges where
  // they catch it, and the milky core. Through the tea it reads as pale amber.
  const drawChunk = (c: Ice, through: boolean) => {
    const sh = c.shape;
    const n = sh.pts.length;
    const cos = Math.cos(c.a);
    const sin = Math.sin(c.a);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.a);
    ctx.scale(c.s, c.s);
    const unit = px / c.s;
    ctx.lineJoin = "round";

    const outline = () => {
      ctx.beginPath();
      sh.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };

    // Clear ice mostly shows what is behind it: only a cool tint on the faces
    // turned away from the window
    const lit = night ? [200, 214, 250] : [255, 255, 255];
    const dim = night ? [96, 116, 170] : [208, 220, 232];
    sh.faces.forEach((f) => {
      const dx = f.dir[0] * cos - f.dir[1] * sin;
      const dy = f.dir[0] * sin + f.dir[1] * cos;
      const t = clamp(0.5 + 0.6 * (dx * LIGHT_2D[0] + dy * LIGHT_2D[1]), 0, 1);
      ctx.beginPath();
      ctx.moveTo(sh.apex[0], sh.apex[1]);
      f.idx.forEach((i) => ctx.lineTo(sh.pts[i][0], sh.pts[i][1]));
      ctx.closePath();
      ctx.fillStyle = through
        ? night
          ? `rgba(255, 196, 140, ${0.08 + 0.2 * t})`
          : `rgba(255, 232, 204, ${0.12 + 0.28 * t})`
        : `rgba(${mix(dim, lit, t)}, ${night ? 0.74 : 0.8})`;
      ctx.fill();
    });

    // Milky core of air frozen into the block
    ctx.beginPath();
    sh.core.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = through
      ? `rgba(255, 240, 222, ${night ? 0.14 : 0.22})`
      : `rgba(255, 255, 255, ${night ? 0.3 : 0.58})`;
    ctx.fill();
    ctx.beginPath();
    sh.streaks.forEach(([p, q]) => {
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    });
    ctx.lineWidth = unit * 1.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = through ? "rgba(255, 240, 222, 0.28)" : night ? "rgba(236, 242, 255, 0.4)" : "rgba(255, 255, 255, 0.85)";
    ctx.stroke();
    ctx.lineCap = "butt";
    sh.bubbles.forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = through ? "rgba(255, 244, 230, 0.3)" : "rgba(255, 255, 255, 0.8)";
      ctx.fill();
    });

    // Fracture lines where the faces meet
    ctx.beginPath();
    sh.faces.forEach((f) => {
      ctx.moveTo(sh.apex[0], sh.apex[1]);
      ctx.lineTo(sh.pts[f.idx[0]][0], sh.pts[f.idx[0]][1]);
    });
    ctx.lineWidth = unit * 1.1;
    ctx.strokeStyle = through
      ? night
        ? "rgba(255, 210, 160, 0.3)"
        : "rgba(255, 238, 216, 0.55)"
      : night
      ? "rgba(236, 242, 255, 0.55)"
      : "rgba(255, 255, 255, 0.95)";
    ctx.stroke();

    outline();
    ctx.lineWidth = unit;
    ctx.strokeStyle = through
      ? night
        ? "rgba(40, 10, 0, 0.5)"
        : "rgba(112, 42, 8, 0.5)"
      : night
      ? "rgba(196, 212, 255, 0.6)"
      : "rgba(52, 76, 116, 0.55)";
    ctx.stroke();

    // Edges turned to the window catch the light
    if (!through) {
      let cx = 0;
      let cy = 0;
      sh.pts.forEach(([x, y]) => {
        cx += x / n;
        cy += y / n;
      });
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const [x0, y0] = sh.pts[i];
        const [x1, y1] = sh.pts[(i + 1) % n];
        let nx = y1 - y0;
        let ny = x0 - x1;
        if (nx * ((x0 + x1) / 2 - cx) + ny * ((y0 + y1) / 2 - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        const m = Math.hypot(nx, ny) || 1;
        const wx = (nx / m) * cos - (ny / m) * sin;
        const wy = (nx / m) * sin + (ny / m) * cos;
        if (wx * LIGHT_2D[0] + wy * LIGHT_2D[1] < 0.3) continue;
        // Just inside the outline so the ink still shows
        const ix = (-nx / m) * 0.045;
        const iy = (-ny / m) * 0.045;
        ctx.moveTo(lerp(x0, x1, 0.12) + ix, lerp(y0, y1, 0.12) + iy);
        ctx.lineTo(lerp(x0, x1, 0.88) + ix, lerp(y0, y1, 0.88) + iy);
      }
      ctx.lineWidth = unit * 2;
      ctx.lineCap = "round";
      if (night) {
        // Lamplight glints on the ice
        glowStroke(unit, 1.8);
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
    ctx.restore();
  };

  const drawStraw = (under: boolean) => {
    const [bx, by] = STRAW_B;
    const [ex, ey] = STRAW_E;
    const len = Math.hypot(ex - bx, ey - by);
    const w = STRAW_W / 2;
    ctx.save();
    // Under the tea the glass and tea act as a lens: it looks wider and the
    // straw seems to break where it enters the surface
    if (under) ctx.scale(1.1, 1);
    ctx.translate(bx, by);
    ctx.rotate(Math.atan2(ey - by, ex - bx));
    const body = night ? "128, 146, 255" : "70, 96, 222";
    ctx.beginPath();
    ctx.rect(0, -w, len, w * 2);
    ctx.fillStyle = `rgba(${body}, ${night ? 0.8 : 0.86})`;
    ctx.fill();
    // Far side in shade, near side catching the window
    ctx.fillStyle = night ? "rgba(20, 24, 80, 0.35)" : "rgba(18, 28, 110, 0.3)";
    ctx.fillRect(0, w * 0.3, len, w * 0.7);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(0, -w * 0.62, len, w * 0.26);
    ctx.lineWidth = px;
    ctx.strokeStyle = night ? "rgba(200, 210, 255, 0.55)" : "rgba(18, 24, 80, 0.55)";
    ctx.beginPath();
    ctx.moveTo(0, -w);
    ctx.lineTo(len, -w);
    ctx.moveTo(0, w);
    ctx.lineTo(len, w);
    ctx.stroke();
    if (!under) {
      // The open end, seen at an angle
      ctx.beginPath();
      ctx.ellipse(len, 0, w * 0.42, w, 0, 0, TAU);
      ctx.fillStyle = night ? "rgb(52, 60, 150)" : "rgb(38, 52, 150)";
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  // Facets of the gelas belimbing. Panels are centred every 30 degrees, so the
  // ones facing us show whole and the outermost two are cut by the silhouette.
  const panels = (() => {
    const out: { a: number; b: number; c: number; half: -1 | 0 | 1 }[] = [];
    const step = TAU / FACETS;
    for (let k = -3; k <= 3; k++) {
      const c = k * step;
      const a = Math.max(-Math.PI / 2, c - step / 2);
      const b = Math.min(Math.PI / 2, c + step / 2);
      out.push({ a, b, c, half: k === -3 ? -1 : k === 3 ? 1 : 0 });
    }
    return out;
  })();

  const traceArch = (pn: (typeof panels)[number], move: boolean) => {
    const [ax, ay] = onGlass(pn.a, RIDGE);
    const [bx, by] = onGlass(pn.b, RIDGE);
    if (pn.half === -1) {
      const [mx, my] = onGlass(pn.a, BAND);
      if (move) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
      ctx.quadraticCurveTo(bx, my, bx, by);
    } else if (pn.half === 1) {
      const [mx, my] = onGlass(pn.b, BAND);
      if (move) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(ax, my, mx, my);
    } else {
      const [mx, my] = onGlass(pn.c, BAND);
      if (move) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(2 * mx - (ax + bx) / 2, 2 * my - (ay + by) / 2, bx, by);
    }
  };

  const tracePanel = (pn: (typeof panels)[number]) => {
    ctx.beginPath();
    traceArch(pn, true);
    const [bx1, by1] = onGlass(pn.b, H);
    ctx.lineTo(bx1, by1);
    for (let s = 1; s <= 6; s++) {
      const [x, y] = onGlass(pn.b + (pn.a - pn.b) * (s / 6), H);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // A strip of the glass between two angles, top to bottom
  const traceStrip = (a: number, b: number) => {
    ctx.beginPath();
    ctx.moveTo(rad(-0.2) * Math.sin(a), -0.2);
    ctx.lineTo(rad(-0.2) * Math.sin(b), -0.2);
    ctx.lineTo(rad(H + 0.2) * Math.sin(b), H + 0.2);
    ctx.lineTo(rad(H + 0.2) * Math.sin(a), H + 0.2);
    ctx.closePath();
  };

  // ---- light -------------------------------------------------------------------
  const silhouetteOn = (g: CanvasRenderingContext2D, dx: number, dy: number) => {
    g.beginPath();
    g.moveTo(-R_TOP + dx, dy);
    g.lineTo(-R_BOT + dx, H + dy);
    for (let s = 1; s < 18; s++) {
      const [x, y] = onGlass(-Math.PI / 2 + (Math.PI * s) / 18, H);
      g.lineTo(x + dx, y + dy);
    }
    g.lineTo(R_BOT + dx, H + dy);
    g.lineTo(R_TOP + dx, dy);
    g.closePath();
  };

  const panesOn = (g: CanvasRenderingContext2D) => {
    g.beginPath();
    PANES.forEach(([x0, x1, y0, y1]) => {
      g.moveTo(PANE_X + x0 + SHEAR * y0, y0);
      g.lineTo(PANE_X + x1 + SHEAR * y0, y0);
      g.lineTo(PANE_X + x1 + SHEAR * y1, y1);
      g.lineTo(PANE_X + x0 + SHEAR * y1, y1);
      g.closePath();
    });
  };

  const drawLight = (v: GlassView, now: number) => {
    if (!lctx) return;
    const g = lctx;
    const lw = Math.max(2, Math.ceil(W * LS));
    const lh = Math.max(2, Math.ceil(Hpx * LS));
    if (light.width !== lw || light.height !== lh) {
      light.width = lw;
      light.height = lh;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, lw, lh);
    g.setTransform(LS * v.u, 0, 0, LS * v.u, LS * v.cx, LS * v.top);
    const L = -v.cx / v.u - 0.2;
    const R = (W - v.cx) / v.u + 0.2;
    const T = -v.top / v.u - 0.2;
    const B = (Hpx - v.top) / v.u + 0.2;
    const [sx, sy] = SHADOW;

    // The caustic rides the tea's surface and wobbles when it is stirred
    let mean = 0;
    let stir = 0;
    for (let i = 0; i < N; i++) {
      mean += hs[i];
      stir += Math.abs(vs[i]);
    }
    mean /= N;
    stir = Math.min(1, stir * 5);
    const top = LEVEL + mean;
    const wob = reduceMotion ? 0 : Math.sin(now * 0.0013) * 0.012 + Math.sin(now * 0.0071) * 0.03 * stir;

    // Light from a lamp or the sun is never razor sharp: soften where it can
    const soft = (blur: number) => {
      if ("filter" in g) g.filter = blur > 0 ? `blur(${blur}px)` : "none";
    };
    // The tea inside the glass's shadow, from its surface down to the floor
    const teaShadow = () => {
      g.beginPath();
      g.moveTo(-inner(top) + sx, top + sy);
      g.lineTo(inner(top) + sx, top + sy);
      g.lineTo(inner(FLOOR) + sx, FLOOR + sy);
      g.lineTo(-inner(FLOOR) + sx, FLOOR + sy);
      g.closePath();
    };

    if (night) {
      // Warm pool around the glass
      const pool = g.createRadialGradient(0.12, 0.35, 0, 0.12, 0.35, 2.5);
      pool.addColorStop(0, "rgba(255, 176, 100, 0.3)");
      pool.addColorStop(0.3, "rgba(255, 160, 90, 0.12)");
      pool.addColorStop(1, "rgba(255, 150, 80, 0)");
      g.fillStyle = pool;
      g.fillRect(L, T, R - L, B - T);

      // The beam itself, a wide soft cone with a brighter core
      const reach = beam.len * 1.2;
      const ex = LAMP[0] + beam.dx * reach;
      const ey = LAMP[1] + beam.dy * reach;
      soft(3);
      [1.4, 0.9].forEach((spread, k) => {
        const w = reach * BEAM * spread;
        g.beginPath();
        g.moveTo(LAMP[0], LAMP[1]);
        g.lineTo(ex - beam.dy * w, ey + beam.dx * w);
        g.lineTo(ex + beam.dy * w, ey - beam.dx * w);
        g.closePath();
        const a = k ? 0.1 : 0.06;
        const shaft = g.createLinearGradient(LAMP[0], LAMP[1], ex, ey);
        shaft.addColorStop(0, `rgba(255, 214, 156, ${a})`);
        shaft.addColorStop(0.7, `rgba(255, 196, 128, ${a * 0.6})`);
        shaft.addColorStop(1, "rgba(255, 186, 116, 0)");
        g.fillStyle = shaft;
        g.fill();
      });
      soft(0);

      // Lamp light lying on the desk in front of the glass
      g.save();
      g.translate(0.3, H + 0.08);
      g.scale(1, 0.2);
      const desk = g.createRadialGradient(0, 0, 0, 0, 0, 2.1);
      desk.addColorStop(0, "rgba(255, 182, 106, 0.28)");
      desk.addColorStop(1, "rgba(255, 170, 96, 0)");
      g.fillStyle = desk;
      g.beginPath();
      g.arc(0, 0, 2.1, 0, TAU);
      g.fill();
      g.restore();

      // Clear glass only dims the lamp a little; the tea in it blocks more
      g.globalCompositeOperation = "destination-out";
      soft(1.6);
      silhouetteOn(g, sx, sy);
      g.fillStyle = "rgba(0, 0, 0, 0.34)";
      g.fill();
      teaShadow();
      g.fillStyle = "rgba(0, 0, 0, 0.6)";
      g.fill();
      soft(0);
      g.globalCompositeOperation = "source-over";
    } else {
      // The room is in shade except where the window lets the sun in
      g.fillStyle = "rgba(60, 52, 48, 0.065)";
      g.fillRect(L, T, R - L, B - T);
      soft(0.8);
      g.globalCompositeOperation = "destination-out";
      panesOn(g);
      g.fillStyle = "#000";
      g.fill();
      g.globalCompositeOperation = "source-over";
      panesOn(g);
      g.fillStyle = "rgba(255, 240, 210, 0.55)";
      g.fill();
      soft(0);

      // The glass's shadow, only visible where the sun falls: faint for the
      // clear glass, deeper where the tea is
      g.save();
      panesOn(g);
      g.clip();
      soft(1.2);
      g.globalCompositeOperation = "destination-out";
      silhouetteOn(g, sx, sy);
      g.fillStyle = "rgba(0, 0, 0, 0.6)";
      g.fill();
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "rgba(60, 52, 48, 0.05)";
      g.fill();
      teaShadow();
      g.fillStyle = "rgba(60, 52, 48, 0.08)";
      g.fill();
      soft(0);
      g.restore();
    }

    // The caustic: amber light gathered by the tea inside the shadow
    g.save();
    if (!night) {
      panesOn(g);
      g.clip();
    }
    soft(1.4);
    const cy = (top + FLOOR) / 2 + sy;
    const amber = g.createRadialGradient(sx - 0.05, cy, 0.02, sx, cy, 0.58);
    amber.addColorStop(0, night ? "rgba(255, 210, 128, 0.95)" : "rgba(255, 206, 124, 0.9)");
    amber.addColorStop(0.5, night ? "rgba(255, 150, 54, 0.5)" : "rgba(252, 156, 62, 0.5)");
    amber.addColorStop(1, night ? "rgba(220, 96, 26, 0.12)" : "rgba(232, 120, 40, 0.16)");
    teaShadow();
    g.fillStyle = amber;
    g.fill();
    // Where the round glass bunches the light up into bright lines
    soft(0.7);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(sx - 0.1 + wob, top + sy + 0.1);
    g.quadraticCurveTo(sx - 0.2 + wob * 1.5, cy, sx - 0.08 - wob, FLOOR + sy - 0.08);
    g.lineWidth = 0.045;
    g.strokeStyle = night ? "rgba(255, 238, 196, 0.95)" : "rgba(255, 244, 210, 0.9)";
    g.stroke();
    g.beginPath();
    g.moveTo(sx + 0.2 - wob, top + sy + 0.16);
    g.quadraticCurveTo(sx + 0.27 - wob, cy + 0.05, sx + 0.17 + wob, FLOOR + sy - 0.12);
    g.lineWidth = 0.025;
    g.stroke();
    // Ice lets the light through in bright flecks
    ice.forEach((c) => {
      if (c.deep) return;
      g.beginPath();
      g.ellipse(c.x + sx, Math.max(c.y, top) + sy + 0.03, c.s * 0.32, c.s * 0.14, c.a, 0, TAU);
      g.fillStyle = night ? "rgba(255, 236, 200, 0.45)" : "rgba(255, 248, 230, 0.55)";
      g.fill();
    });
    soft(0);
    g.restore();

    // Sugar and straw throw shadows too, falling sugar included
    const dark = night ? "rgba(0, 0, 0, 0.55)" : "rgba(60, 52, 48, 0.24)";
    g.save();
    if (!night) {
      panesOn(g);
      g.clip();
    } else {
      g.globalCompositeOperation = "destination-out";
    }
    soft(0.9);
    g.fillStyle = dark;
    cubes.forEach((c) => {
      const h = CUBE * 0.46 * (c.extra ? 0.35 + 0.65 * c.life : 1);
      g.save();
      g.translate(c.x + sx, c.y + sy);
      g.rotate(c.stage === 2 ? c.roll : c.rz);
      g.fillRect(-h, -h, h * 2, h * 2);
      g.restore();
    });
    g.beginPath();
    g.moveTo(STRAW_B[0] + sx, STRAW_B[1] + sy);
    g.lineTo(STRAW_E[0] + sx, STRAW_E[1] + sy);
    g.lineWidth = STRAW_W * 0.8;
    g.strokeStyle = dark;
    g.stroke();
    soft(0);
    g.restore();
  };

  // Condensation: the glass is cold wherever the tea is behind it. Drops
  // are lenses, so they show light at the top and a dark lower rim. They never
  // move on the glass, so they are painted once per size and reused.
  const dew = document.createElement("canvas");
  const dctx = dew.getContext("2d");
  let dewKey = "";
  const paintDew = (g: CanvasRenderingContext2D) => {
    const dewEdge = night ? "50, 14, 0" : "120, 46, 10";
    DEW.forEach((d) => {
      const fx = Math.cos(d.th);
      const [x, y] = onGlass(d.th, d.y);
      const r = d.r;
      if (r < 0.004) {
        // Fine mist between the drops
        g.fillStyle = night ? "rgba(255, 220, 190, 0.16)" : "rgba(255, 246, 236, 0.32)";
        g.fillRect(x - r * fx * 0.6, y - r * 0.6, r * 1.2 * fx, r * 1.2);
        return;
      }
      if (d.run) {
        // A drop that ran down wipes a clear track through the mist
        g.beginPath();
        g.moveTo(x, y - d.run);
        g.lineTo(x, y);
        g.lineWidth = r * 0.9 * fx;
        g.lineCap = "round";
        g.strokeStyle = night ? "rgba(255, 210, 170, 0.12)" : "rgba(255, 240, 226, 0.26)";
        g.stroke();
        g.lineCap = "butt";
      }
      g.beginPath();
      g.ellipse(x, y, r * fx, r * 1.1, 0, 0, TAU);
      g.fillStyle = night ? "rgba(255, 214, 170, 0.18)" : "rgba(255, 240, 224, 0.42)";
      g.fill();
      // Lens: dark on the side away from the window, a glint towards it
      g.beginPath();
      g.ellipse(x, y, r * fx, r * 1.1, 0, -0.1, 1.5);
      g.lineWidth = Math.min(px * 1.1, r * 0.4);
      g.strokeStyle = `rgba(${dewEdge}, ${night ? 0.45 : 0.36})`;
      g.stroke();
      g.beginPath();
      g.arc(x - r * 0.36 * fx, y - r * 0.42, r * 0.28, 0, TAU);
      g.fillStyle = night ? "rgba(255, 240, 225, 0.75)" : "rgba(255, 255, 255, 0.98)";
      g.fill();
    });
  };

  // ---- render ------------------------------------------------------------------
  const render = (now: number) => {
    const v = view();
    px = 1 / v.u;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, Hpx);
    const desk = Math.round(v.top + H * v.u);
    if (desk !== lastDesk) {
      lastDesk = desk;
      host.style.setProperty("--desk-y", `${desk}px`);
    }
    if (follower) {
      follower.style.transform = `translate3d(${v.cx.toFixed(1)}px, ${(v.top + H * v.u + 12).toFixed(1)}px, 0) translateX(-50%)`;
    }

    // Light and shadow on the wall and desk, under everything else. Soft
    // light needs no more than every third frame, unless the glass moves.
    if (lctx) {
      const key = `${v.cx.toFixed(1)} ${v.top.toFixed(1)} ${v.u.toFixed(2)} ${W} ${Hpx} ${night}`;
      if (key !== lightKey || ++lightAge >= 3) {
        drawLight(v, now);
        lightKey = key;
        lightAge = 0;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(light, 0, 0, light.width / LS, light.height / LS);
    }

    ctx.setTransform(dpr * v.u, 0, 0, dpr * v.u, dpr * v.cx, dpr * v.top);

    const ink = night ? "230, 233, 245" : "20, 26, 58";
    const step = TAU / FACETS;

    // Dust turning over in the lamp's beam
    if (night) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      motes.forEach((m) => {
        const along = m.t * beam.len;
        const x = LAMP[0] + beam.dx * along - beam.dy * m.s * along * BEAM;
        const y = LAMP[1] + beam.dy * along + beam.dx * m.s * along * BEAM;
        const twinkle = reduceMotion ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now * m.f + m.ph));
        const a = twinkle * (1 - m.s * m.s) * Math.min(1, (1.1 - m.t) * 3) * 0.75;
        if (a <= 0.01) return;
        ctx.beginPath();
        ctx.arc(x, y, m.r * px, 0, TAU);
        ctx.fillStyle = `rgba(255, 226, 180, ${a})`;
        ctx.fill();
      });
      ctx.restore();
    }

    // ---- on the desk ----
    // The desk edge catches the light where it falls
    const edge = ctx.createLinearGradient(-2, 0, 2.6, 0);
    edge.addColorStop(0, "rgba(255, 210, 150, 0)");
    edge.addColorStop(0.45, night ? "rgba(255, 206, 150, 0.55)" : "rgba(255, 255, 255, 0.9)");
    edge.addColorStop(1, "rgba(255, 210, 150, 0)");
    ctx.fillStyle = edge;
    ctx.fillRect(-2, H - px * 0.5, 4.6, px * 1.2);
    // Contact shadow, pushed right, away from the light
    ctx.beginPath();
    ctx.ellipse(0.2, H + 0.014, R_BOT * 1.55, 0.05, 0, 0, TAU);
    ctx.fillStyle = night ? "rgba(0, 0, 12, 0.3)" : "rgba(20, 26, 58, 0.055)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.03, H + 0.004, R_BOT * 1.04, 0.028, 0, 0, TAU);
    ctx.fillStyle = night ? "rgba(0, 0, 12, 0.5)" : "rgba(20, 26, 58, 0.13)";
    ctx.fill();
    // Ring left by the glass before this one
    ctx.beginPath();
    ctx.ellipse(-0.56, H + 0.032, R_BOT * 0.98, R_BOT * 0.98 * K, 0, 0.05, TAU - 0.6);
    ctx.lineWidth = px * 1.5;
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.12 : 0.09})`;
    ctx.stroke();

    // ---- back of the glass ----
    ctx.beginPath();
    ctx.ellipse(0, 0, R_TOP, R_TOP * K, 0, Math.PI, TAU);
    ctx.lineWidth = px * 1.3;
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.22 : 0.18})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0.002, inner(0), inner(0) * K, 0, Math.PI, TAU);
    ctx.lineWidth = px;
    ctx.strokeStyle = night ? "rgba(220, 228, 255, 0.14)" : "rgba(255, 255, 255, 0.7)";
    ctx.stroke();

    // Straw above the tea; the rim and front glass are drawn over it later
    ctx.save();
    clipAboveTea();
    drawStraw(false);
    ctx.restore();

    // ---- inside the glass ----
    ctx.save();
    pathInterior();
    ctx.clip();

    if (sediment > 0.001) {
      const b = inner(FLOOR);
      ctx.beginPath();
      ctx.moveTo(-b, FLOOR);
      for (let s = 0; s <= 24; s++) {
        const x = -b + (2 * b * s) / 24;
        const front = K * Math.sqrt(Math.max(0, b * b - x * x));
        ctx.lineTo(x, FLOOR + front - sediment * (1 - Math.pow(x / b, 2)) - 0.004);
      }
      ctx.lineTo(b, FLOOR + 0.1);
      ctx.lineTo(-b, FLOOR + 0.1);
      ctx.closePath();
      ctx.fillStyle = night ? "rgba(214, 220, 238, 0.8)" : "rgba(246, 247, 250, 0.92)";
      ctx.fill();
    }

    // Top of the tea, seen from above: a lighter band between back and front edge
    ctx.beginPath();
    traceWater(-1, false, true);
    traceWater(1, true, false);
    ctx.closePath();
    ctx.fillStyle = night ? "rgba(232, 146, 66, 0.86)" : "rgb(240, 172, 100)";
    ctx.fill();

    // Floating ice, above the waterline
    ctx.save();
    clipAboveTea();
    ice.forEach((c) => !c.deep && drawChunk(c, false));
    ctx.restore();

    // The tea, one flat tone per facet of the glass in front of it
    ctx.save();
    clipUnderTea();
    const teaLit = night ? [222, 120, 42] : [212, 112, 40];
    const teaDim = night ? [136, 50, 14] : [158, 62, 20];
    for (let k = -3; k <= 3; k++) {
      const a = Math.max(-Math.PI / 2, (k - 0.5) * step);
      const b = Math.min(Math.PI / 2, (k + 0.5) * step);
      const t = 0.5 + 0.5 * Math.cos(k * step + 0.7);
      traceStrip(a, b);
      ctx.fillStyle = `rgba(${mix(teaDim, teaLit, t)}, ${night ? 0.9 : 0.93})`;
      ctx.fill();
    }
    // Deeper down, more tea between us and the light
    const deep = ctx.createLinearGradient(0, LEVEL, 0, FLOOR);
    deep.addColorStop(0, night ? "rgba(255, 190, 120, 0.12)" : "rgba(255, 220, 160, 0.16)");
    deep.addColorStop(0.35, "rgba(120, 40, 8, 0)");
    deep.addColorStop(1, night ? "rgba(60, 14, 0, 0.42)" : "rgba(90, 28, 4, 0.34)");
    ctx.fillStyle = deep;
    ctx.fillRect(-1, LEVEL - 0.1, 2, FLOOR);
    // Lit from behind, the tea glows from inside
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(-0.06, 0.6, 0.02, -0.02, 0.66, 0.56);
    glow.addColorStop(0, night ? "rgba(255, 150, 54, 0.4)" : "rgba(255, 176, 92, 0.22)");
    glow.addColorStop(0.6, night ? "rgba(255, 120, 30, 0.12)" : "rgba(255, 150, 60, 0.06)");
    glow.addColorStop(1, "rgba(255, 120, 30, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-1, LEVEL - 0.1, 2, FLOOR);
    ctx.restore();

    // What sits in the tea shows through it
    ctx.save();
    ctx.globalAlpha = night ? 0.42 : 0.5;
    drawStraw(true);
    ctx.restore();
    ice.forEach((c) => drawChunk(c, true));
    ctx.restore();

    // Sugar is tinted per cube instead, so it still reads as sugar
    cubes
      .filter((c) => c.stage > 0)
      .sort((a, b) => b.y - a.y)
      .forEach(drawCube);

    grains.forEach((g) => {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, TAU);
      ctx.fillStyle = `rgba(255, 246, 232, ${Math.max(0, g.a) * 0.9})`;
      ctx.fill();
    });

    ctx.beginPath();
    traceWater(1, false, true);
    ctx.lineWidth = px * 1.7;
    ctx.strokeStyle = night ? "rgba(255, 214, 160, 0.6)" : "rgba(255, 244, 228, 0.95)";
    ctx.stroke();
    ctx.beginPath();
    traceWater(-1, false, true);
    ctx.lineWidth = px;
    ctx.strokeStyle = night ? "rgba(120, 44, 8, 0.5)" : "rgba(170, 82, 26, 0.45)";
    ctx.stroke();

    rings.forEach((r) => {
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, TAU);
      ctx.lineWidth = px * 1.6;
      ctx.strokeStyle = `rgba(255, 238, 210, ${r.a})`;
      ctx.stroke();
    });

    cubes.filter((c) => c.stage === 0).forEach(drawCube);
    ctx.restore();

    // ---- front of the glass ----
    ctx.save();
    pathSilhouette();
    ctx.clip();
    panels.forEach((pn, i) => {
      const facing = Math.cos(pn.c + 0.85);
      const sheen = Math.pow(Math.max(0, facing), 4) * (night ? 0.1 : 0.2);
      const shade = Math.max(0, Math.sin(pn.c)) * (night ? 0.12 : 0.06);
      tracePanel(pn);
      const tint = night ? "210, 222, 255" : "255, 255, 255";
      ctx.fillStyle = `rgba(${tint}, ${(night ? 0.03 : 0.06) + sheen + (i % 2 ? 0.035 : 0)})`;
      ctx.fill();
      if (shade > 0) {
        ctx.fillStyle = night ? `rgba(4, 8, 30, ${shade})` : `rgba(20, 26, 58, ${shade})`;
        ctx.fill();
      }
    });

    // Thick base: the light bends through it
    const bi = inner(FLOOR);
    ctx.beginPath();
    ctx.moveTo(-R_BOT - 0.01, FLOOR - 0.01);
    for (let s = 0; s <= 18; s++) {
      const th = -Math.PI / 2 + (Math.PI * s) / 18;
      ctx.lineTo(bi * Math.sin(th), FLOOR + bi * K * Math.cos(th));
    }
    ctx.lineTo(R_BOT + 0.01, FLOOR - 0.01);
    ctx.lineTo(R_BOT + 0.01, H + 0.1);
    ctx.lineTo(-R_BOT - 0.01, H + 0.1);
    ctx.closePath();
    ctx.fillStyle = night ? "rgba(200, 214, 255, 0.08)" : "rgba(255, 255, 255, 0.4)";
    ctx.fill();
    ctx.beginPath();
    for (let s = 0; s <= 18; s++) {
      const th = -Math.PI / 2 + (Math.PI * s) / 18;
      const x = (bi + 0.02) * Math.sin(th);
      const y = (FLOOR + H) / 2 + 0.01 + (bi + 0.02) * K * Math.cos(th);
      if (s) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = px;
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.12 : 0.08})`;
    ctx.stroke();
    ctx.restore();

    // Ridges between the facets, and the arches along their tops
    for (let k = -3; k < 3; k++) {
      const th = (k + 0.5) * step;
      const [x0, y0] = onGlass(th, RIDGE);
      const [x1, y1] = onGlass(th, H);
      const lit = Math.max(0, Math.cos(th + 0.85));
      ctx.beginPath();
      ctx.moveTo(x0 + px * 1.2, y0);
      ctx.lineTo(x1 + px * 1.2, y1);
      ctx.lineWidth = px;
      ctx.strokeStyle = `rgba(${ink}, ${night ? 0.14 : 0.1})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineWidth = px * 1.2;
      ctx.strokeStyle = night
        ? `rgba(220, 230, 255, ${0.12 + 0.22 * lit})`
        : `rgba(255, 255, 255, ${0.35 + 0.5 * lit})`;
      ctx.stroke();
    }
    panels.forEach((pn) => {
      ctx.beginPath();
      traceArch(pn, true);
      ctx.lineWidth = px * 1.2;
      ctx.strokeStyle = night ? "rgba(220, 230, 255, 0.28)" : "rgba(255, 255, 255, 0.9)";
      ctx.stroke();
      ctx.save();
      ctx.translate(0, px * 1.4);
      ctx.beginPath();
      traceArch(pn, true);
      ctx.lineWidth = px;
      ctx.strokeStyle = `rgba(${ink}, ${night ? 0.14 : 0.1})`;
      ctx.stroke();
      ctx.restore();
    });

    // The wall has thickness: a second edge just inside the outline
    ctx.beginPath();
    ctx.moveTo(-rad(0.03) + WALL * 1.3, 0.03 + rad(0.03) * K * 0.2);
    ctx.lineTo(-rad(FLOOR) + WALL * 1.3, FLOOR);
    ctx.lineWidth = px * 1.1;
    ctx.strokeStyle = night ? "rgba(220, 230, 255, 0.22)" : "rgba(255, 255, 255, 0.85)";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rad(0.03) - WALL * 1.3, 0.03 + rad(0.03) * K * 0.2);
    ctx.lineTo(rad(FLOOR) - WALL * 1.3, FLOOR);
    ctx.lineWidth = px;
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.14 : 0.1})`;
    ctx.stroke();

    // Window reflections: crisp bands down the facet that faces the light
    const band = (th: number, y0: number, y1: number, w: number, alpha: number) => {
      const [x0, yy0] = onGlass(th, y0);
      const [x1, yy1] = onGlass(th + 0.03, y1);
      ctx.beginPath();
      ctx.moveTo(x0 - w / 2, yy0);
      ctx.lineTo(x0 + w / 2, yy0 - w * 0.4);
      ctx.lineTo(x1 + w / 2, yy1 - w * 0.4);
      ctx.lineTo(x1 - w / 2, yy1);
      ctx.closePath();
      ctx.fillStyle = night ? `rgba(255, 224, 186, ${alpha * 0.45})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    };
    band(-1.0, 0.3, 0.64, 0.034, 0.62);
    band(-1.0, 0.7, 1.06, 0.034, 0.5);
    band(-0.86, 0.36, 0.92, 0.009, 0.5);
    band(1.14, 0.38, 1.0, 0.012, 0.36);
    band(-1.0, 0.035, 0.115, 0.026, 0.7);

    // Outline, base and the near half of the rim
    ctx.beginPath();
    ctx.moveTo(-R_TOP, 0);
    ctx.lineTo(-R_BOT, H);
    for (let s = 1; s < 18; s++) {
      const [x, y] = onGlass(-Math.PI / 2 + (Math.PI * s) / 18, H);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(R_BOT, H);
    ctx.lineTo(R_TOP, 0);
    ctx.lineWidth = px * 1.3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.34 : 0.3})`;
    ctx.stroke();

    ctx.beginPath();
    for (let s = 0; s <= 18; s++) {
      const th = -Math.PI / 2 + (Math.PI * s) / 18;
      const x = bi * Math.sin(th);
      const y = FLOOR + bi * K * Math.cos(th);
      if (s) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.lineWidth = px * 1.5;
    ctx.strokeStyle = night ? "rgba(220, 230, 255, 0.24)" : "rgba(255, 255, 255, 0.95)";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, R_TOP, R_TOP * K, 0, 0, Math.PI);
    ctx.lineWidth = px * 1.6;
    ctx.strokeStyle = `rgba(${ink}, ${night ? 0.38 : 0.32})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0.004, inner(0), inner(0) * K, 0, 0.12, Math.PI - 0.12);
    ctx.lineWidth = px * 1.4;
    ctx.strokeStyle = night ? "rgba(220, 230, 255, 0.32)" : "rgba(255, 255, 255, 0.95)";
    ctx.stroke();

    // The lamp catches the edges that face it: the left wall, the near rim
    // and the base, glowing a little like any bright highlight
    if (night) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-R_TOP + px * 0.8, 0.02);
      ctx.lineTo(-R_BOT + px * 0.8, H - 0.03);
      glowStroke(px, 1.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, R_TOP, R_TOP * K, 0, Math.PI * 0.5, Math.PI * 0.97);
      glowStroke(px, 1.5);
      ctx.beginPath();
      ctx.ellipse(0, FLOOR, inner(FLOOR), inner(FLOOR) * K, 0, Math.PI * 0.52, Math.PI * 0.9);
      glowStroke(px, 1.3);
      ctx.restore();
    }

    if (dctx) {
      const key = `${v.u.toFixed(2)} ${dpr} ${night}`;
      if (key !== dewKey) {
        dewKey = key;
        dew.width = Math.ceil(1.1 * v.u * dpr);
        dew.height = Math.ceil((H + 0.02) * v.u * dpr);
        dctx.setTransform(dpr * v.u, 0, 0, dpr * v.u, 0.55 * dpr * v.u, 0);
        dctx.clearRect(-0.55, 0, 1.1, H + 0.02);
        paintDew(dctx);
      }
      ctx.drawImage(dew, -0.55, 0, dew.width / (dpr * v.u), dew.height / (dpr * v.u));
    }

    // Splashes can leave the glass
    drops.forEach((d) => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fillStyle = night
        ? `rgba(245, 170, 92, ${Math.max(0, d.a)})`
        : `rgba(196, 98, 34, ${Math.max(0, d.a)})`;
      ctx.fill();
    });
  };

  // Fixed 60 Hz physics steps keep the springs stable on any display
  let last = 0;
  let acc = 0;
  let frames = 0;
  const step = (now: number) => {
    // Late fonts or reflowing copy can move the home slot without resizing the
    // hero, which a ResizeObserver would miss
    if (++frames % 15 === 0) {
      const m = opts.measure();
      if (m) slots = m;
    }
    const dt = last ? Math.min(100, now - last) : 16.667;
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= 16.667 && n < 4) {
      update(now);
      acc -= 16.667;
      n++;
    }
    if (n === 4) acc = 0;
    render(now);
  };

  // ---- lifecycle ---------------------------------------------------------------
  let raf = 0;
  let running = false;
  let inView = true;
  const loop = (now: number) => {
    step(now);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const sync = () => (inView && !document.hidden ? start() : stop());

  const resize = () => {
    const rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    W = rect.width;
    Hpx = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hpx * dpr);
    const m = opts.measure();
    if (m) slots = m;
    if (!running) step(performance.now());
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);
  sync();

  // Stir the tea with the pointer
  let lastX: number | null = null;
  let lastY: number | null = null;
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const v = view();
    const x = (e.clientX - r.left - v.cx) / v.u;
    const y = (e.clientY - r.top - v.top) / v.u;
    if (lastX !== null && lastY !== null) {
      const dx = x - lastX;
      const dy = y - lastY;
      if (Math.abs(x) < span && Math.abs(y - surfAt(x).y) < 0.16) {
        kick(x, clamp(dy * 0.25 + Math.abs(dx) * 0.08, -0.018, 0.018), 2);
      }
      ice.forEach((c) => {
        if (Math.hypot(x - c.x, y - c.y) < c.s * 0.8) {
          c.vx += dx * 0.09;
          c.vy += clamp(dy * 0.14, -0.009, 0.011);
          c.va += dx * 0.7;
        }
      });
    }
    lastX = x;
    lastY = y;
  };
  const onLeave = () => {
    lastX = null;
    lastY = null;
  };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  return {
    view,
    pileX: (i) => PILE[i % PILE.length].x,
    dropTaskCube: (i) => {
      const p = PILE[i % PILE.length];
      cubes.push(launch(p.x, -0.06, 0.01, p.x, restY(p.row), REST_YAW + p.yaw, p.roll, false));
    },
    dropCube: (clientX) => {
      const v = view();
      const x =
        clientX == null
          ? 0
          : clamp((clientX - host.getBoundingClientRect().left - v.cx) / v.u, -0.24, 0.24);
      if (cubes.filter((c) => c.extra).length >= 8) return;
      const tx = clamp(x, -0.22, 0.22);
      cubes.push(
        launch(x, -0.34, 0.006, tx, restY(3), REST_YAW + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.08, true)
      );
    },
    settle: () => {
      cubes.length = 0;
      PILE.forEach((_, i) => cubes.push(restingCube(i)));
      grains.length = 0;
      drops.length = 0;
      rings.length = 0;
    },
    glideHome: (ms) => {
      if (reduceMotion || ms <= 0) {
        morph = 1;
        glide = null;
        return;
      }
      glide = { from: morph, start: performance.now(), dur: ms };
    },
    jumpHome: () => {
      morph = 1;
      glide = null;
    },
    setNight: (n) => {
      night = n;
    },
    destroy: () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    },
  };
};
