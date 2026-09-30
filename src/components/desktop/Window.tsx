import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { apps } from '../../lib/apps';
import type { Rect } from '../../lib/wm/layout';
import { closeWindow, focus, setRect, toggleFloating, toggleFullscreen, type Win } from '../../lib/wm/store';
import { Icon } from '../Icon';

interface Props {
  win: Win;
  rect: Rect;
  focused: boolean;
  index: number;
  children: ComponentChildren;
}

export function Window({ win, rect, focused, index, children }: Props) {
  const meta = apps[win.app];
  const el = useRef<HTMLElement>(null);
  const drag = useRef<{ mode: 'move' | 'resize'; sx: number; sy: number; start: Rect; moved: boolean } | null>(null);

  const onPointerDown = (mode: 'move' | 'resize') => (e: PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    focus(win.id);
    if (win.fullscreen) return;
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: { ...rect }, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    el.current?.classList.add('dragging');
    if (d.mode === 'move') setRect(win.id, { ...d.start, x: d.start.x + dx, y: d.start.y + dy });
    else setRect(win.id, { ...d.start, w: d.start.w + dx, h: d.start.h + dy });
  };

  const onPointerUp = () => {
    drag.current = null;
    el.current?.classList.remove('dragging');
  };

  const title = win.title;
  return (
    <section
      ref={el}
      class={`win${focused ? ' focused' : ''}${win.floating ? ' floating' : ''}${win.fullscreen ? ' fullscreen' : ''}${win.closing ? ' closing' : ''}`}
      style={{
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
        zIndex: win.fullscreen ? 500 : win.floating ? 100 + win.z : win.z,
        '--i': index,
      }}
      aria-label={`${title} window`}
      data-app={win.app}
      onPointerDown={() => !focused && focus(win.id)}
      onFocusIn={() => !focused && focus(win.id)}
    >
      <header
        class="win-bar"
        onPointerDown={onPointerDown('move')}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDblClick={(e) => !(e.target as HTMLElement).closest('button') && toggleFullscreen(win.id)}
      >
        <span class="win-icon" aria-hidden="true">
          <Icon name={meta.icon} size={14} />
        </span>
        <h2 class="win-title">{title}</h2>
        <span class="win-path mono">{win.key ? `${meta.path}/${win.key}` : meta.path}</span>
        <div class="win-actions">
          <button
            type="button"
            class="win-btn float"
            onClick={() => toggleFloating(win.id)}
            aria-label={win.floating ? 'Tile window' : 'Float window'}
            title="Float (Mod+V)"
          >
            <Icon name="float" size={12} />
          </button>
          <button
            type="button"
            class="win-btn max"
            onClick={() => toggleFullscreen(win.id)}
            aria-label={win.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title="Fullscreen (Mod+F)"
          >
            <Icon name="max" size={12} />
          </button>
          <button
            type="button"
            class="win-btn close"
            onClick={() => closeWindow(win.id)}
            aria-label={`Close ${title}`}
            title="Close (Mod+Q)"
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      </header>
      <div class="win-body" tabIndex={0}>
        {children}
      </div>
      {win.floating && !win.fullscreen && (
        <div
          class="win-resize"
          onPointerDown={onPointerDown('resize')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-hidden="true"
        />
      )}
    </section>
  );
}
