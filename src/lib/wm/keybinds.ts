import { $cheatsheet, $launcher, $mode, $saver, cycleTheme } from '../stores';
import {
  $activeWs,
  $focused,
  closeWindow,
  cycleFocus,
  moveToWorkspace,
  openApp,
  switchWorkspace,
  toggleFloating,
  toggleFullscreen,
} from './store';

export const KEYBINDS: { keys: string; action: string }[] = [
  { keys: 'Mod + 1…6', action: 'Switch workspace' },
  { keys: 'Mod + Shift + 1…6', action: 'Move window to workspace' },
  { keys: 'Mod + Enter', action: 'Open terminal' },
  { keys: 'Mod + D  ·  Ctrl + K', action: 'Launcher / command palette' },
  { keys: 'Mod + Q', action: 'Close window' },
  { keys: 'Mod + V', action: 'Toggle floating' },
  { keys: 'Mod + F', action: 'Toggle fullscreen' },
  { keys: 'Mod + J / K  ·  Mod + ←/→', action: 'Cycle focus' },
  { keys: 'Mod + T', action: 'Toggle TTY mode' },
  { keys: 'Mod + P', action: 'Next theme' },
  { keys: 'Mod + L', action: 'Lock screen' },
  { keys: '?', action: 'This cheatsheet' },
  { keys: 'Esc', action: 'Close overlays' },
];

const isEditable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
};

/**
 * Global Hyprland-ish keybinds. "Mod" is Alt or Super/Meta (browsers and
 * desktops swallow most Super combos, so Alt is the practical default).
 */
export function handleKeybind(e: KeyboardEvent): boolean {
  const mod = e.altKey || e.metaKey;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  if ((e.ctrlKey || e.metaKey) && key === 'k') {
    $launcher.set(!$launcher.get());
    return true;
  }
  if (key === 'Escape') {
    if ($launcher.get()) return ($launcher.set(false), true);
    if ($cheatsheet.get()) return ($cheatsheet.set(false), true);
    return false;
  }
  if ($saver.get() !== 'off') return false;

  if (!mod) {
    if (key === '?' && !isEditable(e.target) && $mode.get() === 'gui') {
      $cheatsheet.set(!$cheatsheet.get());
      return true;
    }
    return false;
  }

  // Digit keys via e.code so Shift+1 ("!") still maps to 1.
  const digit = /^Digit([1-6])$/.exec(e.code)?.[1];
  if (digit) {
    const n = Number(digit);
    const f = $focused.get();
    if (e.shiftKey && f) moveToWorkspace(f, n);
    switchWorkspace(n);
    return true;
  }

  const focused = $focused.get();
  switch (key) {
    case 'Enter':
      openApp('terminal', { workspace: $activeWs.get() });
      return true;
    case 'd':
      $launcher.set(!$launcher.get());
      return true;
    case 'q':
      if (focused) closeWindow(focused);
      return true;
    case 'v':
      if (focused) toggleFloating(focused);
      return true;
    case 'f':
      if (focused) toggleFullscreen(focused);
      return true;
    case 'j':
    case 'ArrowRight':
    case 'ArrowDown':
      cycleFocus(1);
      return true;
    case 'k':
    case 'ArrowLeft':
    case 'ArrowUp':
      cycleFocus(-1);
      return true;
    case 't':
      $mode.set($mode.get() === 'gui' ? 'tty' : 'gui');
      return true;
    case 'p':
      cycleTheme(1);
      return true;
    case 'l':
      $saver.set('lock');
      return true;
  }
  return false;
}
