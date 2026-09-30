export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Hyprland-style "dwindle" tiling: each window takes part of the remaining
 * space, splitting along the longer axis, and the next window recurses into
 * what's left. The first split gives the primary window `ratio` of the space.
 */
export function dwindle(count: number, area: Rect, gap = 10, ratio = 0.5): Rect[] {
  if (count <= 0) return [];
  if (count === 1) return [round(area)];

  const horizontal = area.w >= area.h * 1.1; // split side-by-side when wide
  let first: Rect;
  let rest: Rect;
  if (horizontal) {
    const w1 = (area.w - gap) * ratio;
    first = { x: area.x, y: area.y, w: w1, h: area.h };
    rest = { x: area.x + w1 + gap, y: area.y, w: area.w - w1 - gap, h: area.h };
  } else {
    const h1 = (area.h - gap) * ratio;
    first = { x: area.x, y: area.y, w: area.w, h: h1 };
    rest = { x: area.x, y: area.y + h1 + gap, w: area.w, h: area.h - h1 - gap };
  }
  return [round(first), ...dwindle(count - 1, rest, gap, 0.5)];
}

const round = (r: Rect): Rect => ({
  x: Math.round(r.x),
  y: Math.round(r.y),
  w: Math.round(r.w),
  h: Math.round(r.h),
});

/** Keep a floating window at least partially on-screen. */
export function clampRect(r: Rect, area: Rect, min = { w: 280, h: 180 }): Rect {
  const w = Math.min(Math.max(r.w, min.w), area.w);
  const h = Math.min(Math.max(r.h, min.h), area.h);
  const x = Math.min(Math.max(r.x, area.x - w + 80), area.x + area.w - 80);
  const y = Math.min(Math.max(r.y, area.y), area.y + area.h - 40);
  return { x, y, w, h };
}

/** Default size and position for a window that was just made floating. */
export function centeredRect(area: Rect, offset = 0): Rect {
  const w = Math.round(Math.min(area.w * 0.62, 980));
  const h = Math.round(Math.min(area.h * 0.7, 720));
  return {
    x: Math.round(area.x + (area.w - w) / 2 + offset * 28),
    y: Math.round(area.y + (area.h - h) / 2 + offset * 28),
    w,
    h,
  };
}
