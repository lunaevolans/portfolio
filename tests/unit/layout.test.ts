import { describe, expect, it } from 'vitest';
import { clampRect, dwindle } from '../../src/lib/wm/layout';

const area = { x: 0, y: 0, w: 1200, h: 800 };

describe('dwindle', () => {
  it('fills the area with one window', () => {
    expect(dwindle(1, area)).toEqual([area]);
  });
  it('splits wide areas side by side, then recurses', () => {
    const [a, b, c] = dwindle(3, area, 10);
    expect(a).toEqual({ x: 0, y: 0, w: 595, h: 800 });
    expect(b!.x).toBe(605);
    expect(c!.y).toBeGreaterThan(b!.y);
    expect(b!.w).toBe(c!.w);
  });
  it('never overlaps windows', () => {
    const rects = dwindle(6, area, 8);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap).toBe(false);
      }
  });
  it('honours the primary ratio', () => {
    expect(dwindle(2, area, 0, 0.6)[0]!.w).toBe(720);
  });
  it('returns nothing for zero windows', () => {
    expect(dwindle(0, area)).toEqual([]);
  });
});

describe('clampRect', () => {
  it('keeps windows reachable', () => {
    const r = clampRect({ x: 5000, y: -300, w: 100, h: 100 }, area);
    expect(r.x).toBeLessThanOrEqual(area.w - 80);
    expect(r.y).toBe(0);
    expect(r.w).toBe(280);
  });
});
