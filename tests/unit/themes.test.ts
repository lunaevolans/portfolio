import { describe, expect, it } from 'vitest';
import { hexToRgb, themeIds, themes, themesCss } from '../../src/lib/themes';

/** WCAG relative luminance contrast ratio. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, b2] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('themes', () => {
  it('emits every palette key as a CSS variable (accent2 stays accent2)', () => {
    const css = themesCss();
    for (const id of themeIds) expect(css).toContain(`[data-theme="${id}"]`);
    expect(css).toContain('--c-accent2:');
    expect(css).toContain('--c-accent3:');
    expect(css).toContain('--c-on-accent:');
    expect(css).not.toContain('--c-accent-2');
  });

  it.each(themeIds)('%s meets WCAG AA for body and muted text', (id) => {
    const p = themes[id].palette;
    expect(contrast(p.fg, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, p.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
