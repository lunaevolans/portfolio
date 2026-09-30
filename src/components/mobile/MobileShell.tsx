import { useStore } from '@nanostores/preact';
import { atom } from 'nanostores';
import { useEffect, useRef, useState } from 'preact/hooks';
import { site } from '../../config/site';
import { apps, type AppId } from '../../lib/apps';
import { $launcher, $mode, cycleTheme } from '../../lib/stores';
import type { OpenOptions, Win } from '../../lib/wm/store';
import { AppView } from '../desktop/AppView';
import { LaunchContext } from '../context';
import { useNow } from '../hooks';
import { Icon } from '../Icon';

export const $mobileApp = atom<{ app: AppId; opts?: OpenOptions } | null>(null);

const HOME_APPS: AppId[] = ['about', 'projects', 'architecture', 'lab', 'experience', 'skills', 'github', 'blog', 'resume', 'contact'];
const DOCK: AppId[] = ['terminal', 'projects', 'contact'];

function asWin(app: AppId, opts?: OpenOptions): Win {
  return {
    id: `m-${app}-${opts?.key ?? ''}`,
    app,
    key: opts?.key,
    title: opts?.title ?? apps[app].title,
    props: opts?.props ?? {},
    workspace: 0,
    floating: false,
    fullscreen: true,
    rect: null,
    z: 1,
    closing: false,
  };
}

export default function MobileShell() {
  const current = useStore($mobileApp);
  const now = useNow(15000);
  const [stack, setStack] = useState<Win[]>([]);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef<{ x: number; y: number; dx: number } | null>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    const w = asWin(current.app, current.opts);
    setStack((s) => [...s.filter((x) => x.id !== w.id), w]);
    $mobileApp.set(null);
  }, [current]);

  const back = () => {
    setLeaving(true);
    setTimeout(() => {
      setStack((s) => s.slice(0, -1));
      setLeaving(false);
    }, 220);
  };

  const stackLen = useRef(0);
  useEffect(() => {
    if (stack.length > stackLen.current) history.pushState({ sheet: stack.length }, '');
    stackLen.current = stack.length;
  }, [stack.length]);
  useEffect(() => {
    const onPop = () => stackLen.current > 0 && back();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const top = stack[stack.length - 1];
  const launch = (app: AppId, opts?: OpenOptions) => $mobileApp.set({ app, opts });

  // Swipe from the left edge to go back.
  const onDown = (e: PointerEvent) => {
    if (e.clientX < 28) drag.current = { x: e.clientX, y: e.clientY, dx: 0 };
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !sheet.current) return;
    d.dx = Math.max(0, e.clientX - d.x);
    sheet.current.style.transform = `translateX(${d.dx}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !sheet.current) return;
    sheet.current.style.transform = '';
    if (d.dx > 90) history.back();
  };

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <LaunchContext.Provider value={launch}>
      <div class="mobile">
        <header class="m-status mono">
          <b>{time}</b>
          <span class="m-status-r">
            <button type="button" class="m-icon-btn" onClick={() => cycleTheme(1)} aria-label="Next theme">
              <Icon name="palette" size={16} />
            </button>
            <button type="button" class="m-icon-btn" onClick={() => $mode.set('tty')} aria-label="Terminal mode">
              <Icon name="terminal" size={16} />
            </button>
          </span>
        </header>

        <main id="desktop" class="m-home" aria-label="Home screen" inert={!!top}>
          <section class="m-hero">
            <div class="avatar" aria-hidden="true">
              {site.handle.slice(0, 1).toUpperCase()}
            </div>
            <h1 class="grad-text">{site.name}</h1>
            <p class="mono">{site.title}</p>
            <p class="m-tagline">{site.tagline}</p>
          </section>
          <button type="button" class="m-search" onClick={() => $launcher.set(true)}>
            <Icon name="search" size={16} /> Search apps, projects, posts…
          </button>
          <ul class="m-grid">
            {HOME_APPS.map((id, i) => (
              <li style={{ '--i': i }}>
                <button type="button" class="m-app" onClick={() => launch(id)}>
                  <span class="m-app-icon">
                    <Icon name={apps[id].icon} size={24} />
                  </span>
                  <span class="m-app-label">{apps[id].path.replace('~/', '')}</span>
                </button>
              </li>
            ))}
          </ul>
        </main>

        <nav class="m-dock" aria-label="Dock">
          {DOCK.map((id) => (
            <button type="button" class="m-app" onClick={() => launch(id)} aria-label={apps[id].description}>
              <span class="m-app-icon">
                <Icon name={apps[id].icon} size={22} />
              </span>
            </button>
          ))}
        </nav>

        {top && (
          <div
            ref={sheet}
            class={`m-sheet${leaving ? ' leaving' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={top.title}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <header class="m-sheet-bar">
              <button type="button" class="m-icon-btn" onClick={() => history.back()} aria-label="Back">
                <Icon name="back" size={20} />
              </button>
              <h2>{top.title}</h2>
              <span class="mono muted">{apps[top.app].path}</span>
            </header>
            <div class="m-sheet-body" key={top.id} tabIndex={0}>
              <AppView win={top} />
            </div>
          </div>
        )}
      </div>
    </LaunchContext.Provider>
  );
}
