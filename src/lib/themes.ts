/**
 * Rice palettes. This file is the single source of truth: CSS custom
 * properties, the WebGL wallpaper uniforms, xterm colours and chart colours
 * are all derived from it.
 */

export interface Palette {
  /** Page background / wallpaper base. */
  bg: string;
  /** Window body. */
  surface: string;
  /** Raised elements inside windows (inputs, cards). */
  overlay: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  accent3: string;
  /** Text colour on top of `accent`. */
  onAccent: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  dark: boolean;
  palette: Palette;
}

export const themeIds = ['bazzite', 'catppuccin-mocha', 'catppuccin-latte', 'tokyo-night', 'gruvbox', 'nord', 'rose-pine'] as const;

export type ThemeId = (typeof themeIds)[number];

export const themes: Record<ThemeId, Theme> = {
  bazzite: {
    id: 'bazzite',
    name: 'Bazzite',
    dark: true,
    palette: {
      bg: '#08070f',
      surface: '#12101f',
      overlay: '#1c1930',
      border: '#2e2950',
      fg: '#ece8ff',
      muted: '#a59ec9',
      accent: '#a67cff',
      accent2: '#ff5fd2',
      accent3: '#43e0ff',
      onAccent: '#0b0914',
      red: '#ff6b8b',
      green: '#6ff0a8',
      yellow: '#ffd36b',
      blue: '#7aa7ff',
    },
  },
  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    dark: true,
    palette: {
      bg: '#11111b',
      surface: '#1e1e2e',
      overlay: '#313244',
      border: '#45475a',
      fg: '#cdd6f4',
      muted: '#a6adc8',
      accent: '#cba6f7',
      accent2: '#f5c2e7',
      accent3: '#74c7ec',
      onAccent: '#11111b',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
    },
  },
  'catppuccin-latte': {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    dark: false,
    palette: {
      bg: '#dce0e8',
      surface: '#eff1f5',
      overlay: '#e6e9ef',
      border: '#bcc0cc',
      fg: '#4c4f69',
      muted: '#5c5f77',
      accent: '#8839ef',
      accent2: '#d0369e',
      accent3: '#1b7f93',
      onAccent: '#ffffff',
      red: '#d20f39',
      green: '#2f7d1f',
      yellow: '#9a5d0a',
      blue: '#1e66f5',
    },
  },
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    dark: true,
    palette: {
      bg: '#0f0f17',
      surface: '#1a1b26',
      overlay: '#24283b',
      border: '#3b4261',
      fg: '#c0caf5',
      muted: '#9aa5ce',
      accent: '#bb9af7',
      accent2: '#7aa2f7',
      accent3: '#7dcfff',
      onAccent: '#16161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
    },
  },
  gruvbox: {
    id: 'gruvbox',
    name: 'Gruvbox',
    dark: true,
    palette: {
      bg: '#151515',
      surface: '#1d2021',
      overlay: '#32302f',
      border: '#504945',
      fg: '#ebdbb2',
      muted: '#bdae93',
      accent: '#fe8019',
      accent2: '#fabd2f',
      accent3: '#8ec07c',
      onAccent: '#1d2021',
      red: '#fb4934',
      green: '#b8bb26',
      yellow: '#fabd2f',
      blue: '#83a598',
    },
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    dark: true,
    palette: {
      bg: '#1f232b',
      surface: '#2e3440',
      overlay: '#3b4252',
      border: '#4c566a',
      fg: '#eceff4',
      muted: '#d8dee9',
      accent: '#88c0d0',
      accent2: '#b48ead',
      accent3: '#8fbcbb',
      onAccent: '#2e3440',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
    },
  },
  'rose-pine': {
    id: 'rose-pine',
    name: 'Rosé Pine',
    dark: true,
    palette: {
      bg: '#12101b',
      surface: '#191724',
      overlay: '#26233a',
      border: '#403d52',
      fg: '#e0def4',
      muted: '#a8a4c4',
      accent: '#c4a7e7',
      accent2: '#ebbcba',
      accent3: '#9ccfd8',
      onAccent: '#191724',
      red: '#eb6f92',
      green: '#9ccfd8',
      yellow: '#f6c177',
      blue: '#6fa3b8',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'bazzite';
export const THEME_STORAGE_KEY = 'luna.theme';

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && (themeIds as readonly string[]).includes(v);
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** `[data-theme="x"] { --c-bg: …; }` blocks for every theme. */
export function themesCss(): string {
  return Object.values(themes)
    .map((t) => {
      const vars = Object.entries(t.palette)
        .map(([k, v]) => `--c-${kebab(k)}:${v};`)
        .join('');
      return `[data-theme="${t.id}"]{${vars}color-scheme:${t.dark ? 'dark' : 'light'};}`;
    })
    .join('\n');
}

/** `#rrggbb` → `[r, g, b]` in 0–1, for shader uniforms. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
