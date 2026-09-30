import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { apps, WORKSPACES } from '../../lib/apps';
import { $cheatsheet, $launcher, $mode, $saver, $theme, reboot, setTheme } from '../../lib/stores';
import { themeIds, themes } from '../../lib/themes';
import { $activeWs, $focusedWin, $windows, switchWorkspace } from '../../lib/wm/store';
import { useNow } from '../hooks';
import { Icon } from '../Icon';

function useFps() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

function useHeap() {
  const [mb, setMb] = useState<number | null>(null);
  useEffect(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (!perf.memory) return;
    const tick = () => setMb(Math.round(perf.memory!.usedJSHeapSize / 1048576));
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, []);
  return mb;
}

function Menu({
  label,
  icon,
  children,
  class: cls,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  children: (close: () => void) => preact.ComponentChildren;
  class?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div class={`bar-menu ${cls ?? ''}`} ref={ref}>
      <button
        type="button"
        class="bar-mod bar-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} size={14} />
      </button>
      {open && (
        <div class="bar-dropdown" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const active = useStore($activeWs);
  const windows = useStore($windows);
  const focusedWin = useStore($focusedWin);
  const theme = useStore($theme);
  const mode = useStore($mode);
  const now = useNow(1000);
  const fps = useFps();
  const heap = useHeap();

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header class="topbar" role="banner">
      <nav class="bar-left" aria-label="Workspaces">
        <button
          type="button"
          class="bar-mod bar-logo"
          onClick={() => $launcher.set(true)}
          aria-label="Open launcher (Ctrl+K)"
          title="Launcher (Ctrl+K)"
        >
          <svg viewBox="0 0 64 64" width="18" height="18" aria-hidden="true">
            <path
              d="M22 16h13.5c6 0 9.5 3.2 9.5 8 0 3.2-1.7 5.4-4.3 6.4 3.4.9 5.6 3.5 5.6 7.2 0 5.3-3.9 8.4-10.2 8.4H22V16zm7 5.6v7.1h5.6c2.4 0 3.8-1.3 3.8-3.6s-1.4-3.5-3.8-3.5H29zm0 12.4v7.9h6.2c2.7 0 4.2-1.4 4.2-4s-1.5-3.9-4.2-3.9H29z"
              fill="currentColor"
            />
          </svg>
        </button>
        <ol class="bar-mod ws-list">
          {WORKSPACES.map((ws) => {
            const occupied = windows.some((w) => w.workspace === ws.n && !w.closing);
            return (
              <li key={ws.n}>
                <button
                  type="button"
                  class={`ws-pill${ws.n === active ? ' active' : ''}${occupied ? ' occupied' : ''}`}
                  onClick={() => switchWorkspace(ws.n)}
                  aria-pressed={ws.n === active}
                  aria-label={`Workspace ${ws.n}: ${ws.name}`}
                  title={`${ws.name} (Alt+${ws.n})`}
                >
                  <span class="ws-n">{ws.n}</span>
                  <span class="ws-name">{ws.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div class="bar-center bar-mod mono" aria-live="polite">
        {focusedWin ? (
          <>
            <Icon name={apps[focusedWin.app].icon} size={13} />
            <span class="bar-title">{focusedWin.title}</span>
          </>
        ) : (
          <span class="muted">{`${WORKSPACES[active - 1]?.name ?? ''}`}</span>
        )}
      </div>

      <div class="bar-right">
        <div class="bar-mod bar-stats mono" title="Frames per second · JS heap" aria-label={`${fps} frames per second`}>
          <span class="stat">
            <span class="stat-k">fps</span> <span class={fps < 40 ? 'warn' : ''}>{fps}</span>
          </span>
          {heap !== null && (
            <span class="stat">
              <span class="stat-k">mem</span> {heap}M
            </span>
          )}
        </div>

        <Menu label="Theme" icon="palette" class="theme-menu">
          {(close) =>
            themeIds.map((id) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={id === theme}
                class={`menu-item${id === theme ? ' on' : ''}`}
                onClick={() => {
                  setTheme(id);
                  close();
                }}
              >
                <span class="swatches" aria-hidden="true">
                  {(['bg', 'accent', 'accent2', 'accent3'] as const).map((k) => (
                    <i style={{ background: themes[id].palette[k] }} />
                  ))}
                </span>
                {themes[id].name}
              </button>
            ))
          }
        </Menu>

        <button
          type="button"
          class="bar-mod bar-btn tty-toggle mono"
          onClick={() => $mode.set(mode === 'gui' ? 'tty' : 'gui')}
          aria-label="Switch to terminal mode (Alt+T)"
          title="Terminal mode (Alt+T)"
        >
          <Icon name="terminal" size={14} />
          <span>tty</span>
        </button>

        <button
          type="button"
          class="bar-mod bar-btn"
          onClick={() => $cheatsheet.set(true)}
          aria-label="Keyboard shortcuts (?)"
          title="Keybinds (?)"
        >
          <Icon name="keyboard" size={14} />
        </button>

        <div class="bar-mod bar-clock mono" aria-label={`${date} ${time}`}>
          <span class="muted">{date}</span> <b>{time}</b>
        </div>

        <Menu label="Power" icon="power" class="power-menu">
          {(close) => (
            <>
              <button type="button" role="menuitem" class="menu-item" onClick={() => (close(), $saver.set('lock'))}>
                <Icon name="lock" size={14} /> Lock
              </button>
              <button type="button" role="menuitem" class="menu-item" onClick={() => (close(), reboot())}>
                <Icon name="power" size={14} /> Reboot (replay boot)
              </button>
              <button type="button" role="menuitem" class="menu-item" onClick={() => (close(), $mode.set('tty'))}>
                <Icon name="terminal" size={14} /> Log out to TTY
              </button>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
