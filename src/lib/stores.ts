import { atom } from 'nanostores';
import { DEFAULT_THEME, THEME_STORAGE_KEY, isThemeId, themes, type ThemeId } from './themes';

export type Mode = 'gui' | 'tty';
export type SaverState = 'off' | 'saver' | 'lock';

export const $theme = atom<ThemeId>(DEFAULT_THEME);
export const $mode = atom<Mode>('gui');
export const $booted = atom(false);
export const $launcher = atom(false);
export const $cheatsheet = atom(false);
export const $saver = atom<SaverState>('off');
export const $reducedMotion = atom(false);

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: 'info' | 'ok' | 'warn' | 'err';
}
export const $toasts = atom<Toast[]>([]);

let toastSeq = 0;
export function toast(title: string, body?: string, tone: Toast['tone'] = 'info', ttl = 4200) {
  const t: Toast = { id: ++toastSeq, title, body, tone };
  $toasts.set([...$toasts.get(), t].slice(-4));
  if (typeof window !== 'undefined') setTimeout(() => dismissToast(t.id), ttl);
}
export function dismissToast(id: number) {
  $toasts.set($toasts.get().filter((t) => t.id !== id));
}

const safe = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

/** Read the theme the inline head script already applied. */
export function hydrateTheme() {
  const current = document.documentElement.dataset.theme;
  if (isThemeId(current)) $theme.set(current);
}

export function setTheme(id: ThemeId, notify = true) {
  $theme.set(id);
  document.documentElement.dataset.theme = id;
  safe(() => localStorage.setItem(THEME_STORAGE_KEY, id));
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', themes[id].palette.bg);
  if (notify) toast('Theme applied', themes[id].name, 'ok', 2400);
}

export function cycleTheme(dir: 1 | -1 = 1) {
  const ids = Object.keys(themes) as ThemeId[];
  const i = ids.indexOf($theme.get());
  setTheme(ids[(i + dir + ids.length) % ids.length] as ThemeId);
}

export const BOOT_KEY = 'luna.booted';
export function markBooted() {
  $booted.set(true);
  safe(() => sessionStorage.setItem(BOOT_KEY, '1'));
}
export function hasBootedThisSession() {
  return safe(() => sessionStorage.getItem(BOOT_KEY) === '1') ?? false;
}
export function reboot() {
  safe(() => sessionStorage.removeItem(BOOT_KEY));
  if (typeof document !== 'undefined') delete document.documentElement.dataset.booted;
  $mode.set('gui');
  $booted.set(false);
}
