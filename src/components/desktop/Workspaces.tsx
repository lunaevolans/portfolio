import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { WORKSPACES } from '../../lib/apps';
import { dwindle, type Rect } from '../../lib/wm/layout';
import { $activeWs, $area, $focused, $windows } from '../../lib/wm/store';
import { AppView } from './AppView';
import { Window } from './Window';

const GAP = 10;
const OUTER = 12;

export function Workspaces() {
  const windows = useStore($windows);
  const active = useStore($activeWs);
  const focused = useStore($focused);
  const area = useStore($area);
  const root = useRef<HTMLElement>(null);
  // App bodies mount the first time their workspace is shown, so hidden
  // workspaces don't pay for force simulations, charts or terminals up front.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([active]));
  useEffect(() => {
    if (!visited.has(active)) setVisited(new Set(visited).add(active));
  }, [active]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => $area.set({ x: OUTER, y: OUTER, w: el.clientWidth - OUTER * 2, h: el.clientHeight - OUTER * 2 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <main id="desktop" ref={root} class="workspaces" aria-label="Desktop">
      {WORKSPACES.map((ws) => {
        const list = windows.filter((w) => w.workspace === ws.n);
        const tiled = list.filter((w) => !w.floating && !w.fullscreen && !w.closing);
        const rects = dwindle(tiled.length, area, GAP, tiled.length === 3 ? 0.56 : 0.5);
        const rectFor = (id: string): Rect => {
          const w = list.find((x) => x.id === id)!;
          if (w.fullscreen) return { x: 0, y: 0, w: area.w + OUTER * 2, h: area.h + OUTER * 2 };
          if (w.floating && w.rect) return w.rect;
          const i = tiled.findIndex((x) => x.id === id);
          return rects[i] ?? w.rect ?? area;
        };
        const offset = ws.n - active;
        const isActive = offset === 0;
        return (
          <div
            key={ws.n}
            class={`ws${isActive ? ' active' : ''}`}
            style={{ transform: `translate3d(${offset * 100}%, 0, 0)` }}
            aria-hidden={!isActive}
            inert={!isActive}
            data-ws={ws.n}
          >
            {list.map((w, i) => (
              <Window key={w.id} win={w} rect={rectFor(w.id)} focused={w.id === focused} index={i}>
                {visited.has(ws.n) || isActive ? <AppView win={w} /> : null}
              </Window>
            ))}
            {!list.some((w) => !w.closing) && (
              <div class="ws-empty mono">
                <p class="ws-empty-n">{ws.n}</p>
                <p>
                  workspace <b>{ws.name}</b> is empty
                </p>
                <p class="muted">
                  <kbd>Alt</kbd> + <kbd>Enter</kbd> terminal · <kbd>Ctrl</kbd> + <kbd>K</kbd> launcher
                </p>
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}
