import { beforeEach, describe, expect, it } from 'vitest';
import {
  $activeWs,
  $focused,
  $windows,
  closeWindow,
  initWorkspaces,
  moveToWorkspace,
  openApp,
  resetWm,
  switchWorkspace,
  toggleFloating,
  windowsOn,
} from '../../src/lib/wm/store';

beforeEach(() => resetWm());

describe('window manager', () => {
  it('populates default workspaces', () => {
    initWorkspaces();
    expect(windowsOn(1).map((w) => w.app)).toEqual(['about', 'skills', 'experience']);
    expect(windowsOn(3).map((w) => w.app)).toEqual(['architecture']);
    expect($activeWs.get()).toBe(1);
  });

  it('focuses singletons instead of duplicating', () => {
    initWorkspaces();
    const before = $windows.get().length;
    const id = openApp('lab');
    expect($windows.get().length).toBe(before);
    expect($activeWs.get()).toBe(4);
    expect($focused.get()).toBe(id);
  });

  it('opens keyed multi-instance windows once per key', () => {
    switchWorkspace(2);
    const a = openApp('project', { key: 'helios' });
    const b = openApp('project', { key: 'helios' });
    const c = openApp('project', { key: 'quanta' });
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(windowsOn(2)).toHaveLength(2);
  });

  it('closes windows and moves focus', () => {
    initWorkspaces();
    const [first, second] = windowsOn(1);
    $focused.set(second!.id);
    closeWindow(second!.id, 0);
    expect($windows.get().find((w) => w.id === second!.id)).toBeUndefined();
    expect($focused.get()).not.toBe(second!.id);
    expect(first).toBeDefined();
  });

  it('toggles floating with a rect', () => {
    const id = openApp('terminal');
    toggleFloating(id);
    const w = $windows.get().find((x) => x.id === id)!;
    expect(w.floating).toBe(true);
    expect(w.rect).not.toBeNull();
  });

  it('moves windows between workspaces', () => {
    initWorkspaces();
    const w = windowsOn(1)[0]!;
    moveToWorkspace(w.id, 5);
    expect(windowsOn(5).map((x) => x.id)).toContain(w.id);
    moveToWorkspace(w.id, 99);
    expect(windowsOn(5).map((x) => x.id)).toContain(w.id);
  });
});
