import { atom, computed } from 'nanostores';
import { apps, WORKSPACES, type AppId } from '../apps';
import { centeredRect, clampRect, type Rect } from './layout';

export interface Win {
  id: string;
  app: AppId;
  /** Distinguishes multi-instance windows (e.g. a project slug). */
  key?: string;
  title: string;
  props: Record<string, string>;
  workspace: number;
  floating: boolean;
  fullscreen: boolean;
  rect: Rect | null;
  z: number;
  closing: boolean;
}

export const WORKSPACE_COUNT = WORKSPACES.length;

export const $windows = atom<Win[]>([]);
export const $activeWs = atom(1);
export const $focused = atom<string | null>(null);
/** Usable tiling area in px, kept up to date by the desktop. */
export const $area = atom<Rect>({ x: 0, y: 0, w: 1280, h: 720 });

export const $focusedWin = computed([$windows, $focused], (ws, id) => ws.find((w) => w.id === id) ?? null);

let seq = 0;
let zTop = 10;

const update = (id: string, patch: Partial<Win> | ((w: Win) => Partial<Win>)) =>
  $windows.set($windows.get().map((w) => (w.id === id ? { ...w, ...(typeof patch === 'function' ? patch(w) : patch) } : w)));

export function windowsOn(ws: number, list = $windows.get()) {
  return list.filter((w) => w.workspace === ws && !w.closing);
}

export interface OpenOptions {
  key?: string;
  title?: string;
  props?: Record<string, string>;
  workspace?: number;
  focus?: boolean;
  floating?: boolean;
}

/** Open (or focus, for singletons / matching keys) an application window. */
export function openApp(app: AppId, opts: OpenOptions = {}): string {
  const meta = apps[app];
  const existing = $windows
    .get()
    .find((w) => !w.closing && w.app === app && (meta.singleton || (opts.key !== undefined && w.key === opts.key)));
  if (existing) {
    if (opts.focus !== false) {
      $activeWs.set(existing.workspace);
      focus(existing.id);
    }
    return existing.id;
  }

  const workspace = opts.workspace ?? (meta.workspace || $activeWs.get());
  const id = `${app}-${++seq}`;
  const win: Win = {
    id,
    app,
    key: opts.key,
    title: opts.title ?? meta.title,
    props: opts.props ?? {},
    workspace,
    floating: opts.floating ?? false,
    fullscreen: false,
    rect: opts.floating ? centeredRect($area.get(), windowsOn(workspace).length) : null,
    z: ++zTop,
    closing: false,
  };
  $windows.set([...$windows.get(), win]);
  if (opts.focus !== false) {
    $activeWs.set(workspace);
    $focused.set(id);
  }
  return id;
}

export function focus(id: string) {
  const w = $windows.get().find((x) => x.id === id);
  if (!w) return;
  $focused.set(id);
  if (w.z !== zTop) update(id, { z: ++zTop });
}

export function closeWindow(id: string, delay = 180) {
  const w = $windows.get().find((x) => x.id === id);
  if (!w || w.closing) return;
  update(id, { closing: true });
  const remaining = windowsOn(w.workspace);
  if ($focused.get() === id) $focused.set(remaining[remaining.length - 1]?.id ?? null);
  const remove = () => $windows.set($windows.get().filter((x) => x.id !== id));
  if (delay > 0) setTimeout(remove, delay);
  else remove();
}

export function toggleFloating(id: string) {
  update(id, (w) => {
    const floating = !w.floating;
    const offset = windowsOn(w.workspace).filter((x) => x.floating).length;
    return { floating, fullscreen: false, rect: floating ? (w.rect ?? centeredRect($area.get(), offset)) : w.rect };
  });
  focus(id);
}

export function toggleFullscreen(id: string) {
  update(id, (w) => ({ fullscreen: !w.fullscreen }));
  focus(id);
}

export function setRect(id: string, rect: Rect) {
  update(id, { rect: clampRect(rect, $area.get()), floating: true });
}

export function moveToWorkspace(id: string, ws: number) {
  if (ws < 1 || ws > WORKSPACE_COUNT) return;
  update(id, { workspace: ws });
}

export function switchWorkspace(ws: number) {
  if (ws < 1 || ws > WORKSPACE_COUNT) return;
  $activeWs.set(ws);
  const top = windowsOn(ws).sort((a, b) => b.z - a.z)[0];
  $focused.set(top?.id ?? null);
}

/** Cycle focus through windows on the active workspace. */
export function cycleFocus(dir: 1 | -1) {
  const list = windowsOn($activeWs.get());
  if (!list.length) return;
  const i = list.findIndex((w) => w.id === $focused.get());
  const next = list[(i + dir + list.length) % list.length];
  if (next) focus(next.id);
}

/** Populate the default workspaces. */
export function initWorkspaces() {
  if ($windows.get().length) return;
  for (const ws of WORKSPACES) for (const app of ws.apps) openApp(app, { workspace: ws.n, focus: false });
  $activeWs.set(1);
  $focused.set(windowsOn(1)[0]?.id ?? null);
}

/** Test helper. */
export function resetWm() {
  seq = 0;
  zTop = 10;
  $windows.set([]);
  $activeWs.set(1);
  $focused.set(null);
}
