/** Deterministic synthetic datasets for the Lab charts (seeded, so builds are stable). */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rnd: () => number) {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface ForecastPoint {
  week: number;
  actual?: number;
  forecast?: number;
  lo?: number;
  hi?: number;
}

export function forecastSeries(seed = 4471): ForecastPoint[] {
  const rnd = mulberry32(seed);
  const pts: ForecastPoint[] = [];
  const level = (w: number) => 180 + w * 1.1 + 38 * Math.sin((2 * Math.PI * w) / 26) + (w % 13 === 6 ? 70 : 0);
  for (let w = 0; w < 52; w++) pts.push({ week: w, actual: Math.round(level(w) + gauss(rnd) * 14) });
  const last = pts[51]!;
  last.forecast = last.actual;
  last.lo = last.actual;
  last.hi = last.actual;
  for (let w = 52; w < 64; w++) {
    const f = level(w) * 0.98;
    const width = 20 + (w - 51) * 3.2;
    pts.push({
      week: w,
      forecast: Math.round(f),
      lo: Math.round(f - width),
      hi: Math.round(f + width),
      actual: w < 56 ? Math.round(level(w) + gauss(rnd) * 14) : undefined,
    });
  }
  return pts;
}

export interface ClusterPoint {
  x: number;
  y: number;
  segment: string;
}

export const SEGMENTS = ['power users', 'collaborators', 'dormant trialists', 'API-first'];

export function clusterPoints(seed = 7): ClusterPoint[] {
  const rnd = mulberry32(seed);
  const centers = [
    [2.2, 3.1, 0.7],
    [-2.4, 1.8, 0.9],
    [0.3, -2.6, 1.1],
    [3.6, -1.2, 0.55],
  ] as const;
  const sizes = [70, 110, 160, 45];
  return centers.flatMap(([cx, cy, s], i) =>
    Array.from({ length: sizes[i]! }, () => ({ x: cx + gauss(rnd) * s, y: cy + gauss(rnd) * s * 0.8, segment: SEGMENTS[i]! })),
  );
}

export interface RocPoint {
  fpr: number;
  tpr: number;
  model: string;
}

export function rocCurves(): RocPoint[] {
  const curve = (model: string, power: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const fpr = i / 40;
      return { fpr, tpr: Math.min(1, 1 - Math.pow(1 - fpr, power)), model };
    });
  return [...curve('gradient boosting (AUC 0.89)', 5.2), ...curve('heuristic: no login 14d (AUC 0.71)', 2.1), ...curve('random', 1)];
}

export function featureImportance() {
  return [
    { feature: 'seat utilisation (30d)', value: 0.231 },
    { feature: 'collaborative actions / wk', value: 0.197 },
    { feature: 'days since last invite', value: 0.152 },
    { feature: 'support tickets (90d)', value: 0.094 },
    { feature: 'integrations enabled', value: 0.081 },
    { feature: 'plan tier', value: 0.063 },
    { feature: 'raw login count', value: 0.041 },
    { feature: 'account age', value: 0.029 },
  ];
}
