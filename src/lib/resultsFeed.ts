import { SUGAR_QUESTIONS, TASK_QUESTIONS } from "../data/questionnaireData";

// One respondent on the chart: mean option number of each part, 1..5
export interface ResultPoint {
  task: number;
  sugar: number;
}

export interface ResultStats {
  n: number;
  r: number | null;
  slope: number | null;
  intercept: number | null;
}

const MY_POINT_KEY = "takaran_my_point";

export const resultsUrl = (): string => {
  let url = "";
  try {
    url = localStorage.getItem("ugm_psi_webhook_url") || "";
  } catch {
    // ignore
  }
  url = url || import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";
  return url.startsWith("https://") ? url : "";
};

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// Answers keyed by question id (q1..q11); skipped questions are left out
export const toPoint = (answers: Record<string, unknown>): ResultPoint | null => {
  const pick = (ids: string[]) =>
    ids
      .map((id) => Number(answers[id]))
      .filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
  const task = mean(pick(TASK_QUESTIONS.map((q) => q.id)));
  const sugar = mean(pick(SUGAR_QUESTIONS.map((q) => q.id)));
  return task == null || sugar == null ? null : { task, sugar };
};

// The Apps Script doGet sends only the Q1..Q11 columns, never initials or IDs
export async function fetchResultPoints(url: string, signal?: AbortSignal): Promise<ResultPoint[]> {
  const res = await fetch(url, { signal, cache: "no-store" });
  const data = (await res.json()) as { status?: string; rows?: unknown[][] };
  if (data.status !== "ok" || !Array.isArray(data.rows)) throw new Error("Format data tidak dikenal");

  const ids = [...TASK_QUESTIONS, ...SUGAR_QUESTIONS].map((q) => q.id);
  const points: ResultPoint[] = [];
  for (const row of data.rows) {
    if (!Array.isArray(row)) continue;
    const answers: Record<string, unknown> = {};
    ids.forEach((id, i) => {
      answers[id] = row[i] === "" ? undefined : row[i];
    });
    const p = toPoint(answers);
    if (p) points.push(p);
  }
  return points;
}

// Pearson r and the least-squares line, sugar = slope * task + intercept
export function computeStats(points: ResultPoint[]): ResultStats {
  const n = points.length;
  const empty = { n, r: null, slope: null, intercept: null };
  if (n < 3) return empty;
  const mx = points.reduce((a, p) => a + p.task, 0) / n;
  const my = points.reduce((a, p) => a + p.sugar, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.task - mx) ** 2;
    syy += (p.sugar - my) ** 2;
    sxy += (p.task - mx) * (p.sugar - my);
  }
  if (sxx === 0) return empty;
  const slope = sxy / sxx;
  return {
    n,
    r: syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy),
    slope,
    intercept: my - slope * mx,
  };
}

export const saveMyPoint = (answers: Record<string, number>) => {
  const p = toPoint(answers);
  try {
    if (p) localStorage.setItem(MY_POINT_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
};

export const loadMyPoint = (): ResultPoint | null => {
  try {
    const raw = localStorage.getItem(MY_POINT_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return p && Number.isFinite(p.task) && Number.isFinite(p.sugar) ? p : null;
  } catch {
    return null;
  }
};
