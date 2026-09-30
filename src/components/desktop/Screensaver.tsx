import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { site } from '../../config/site';
import { $saver, $theme } from '../../lib/stores';
import { themes } from '../../lib/themes';
import { useNow } from '../hooks';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEF<>/{}[]$#@*+=';

/** cmatrix rain on a canvas. Stops when unmounted. */
export function MatrixRain({ opacity = 1 }: { opacity?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useStore($theme);
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const p = themes[theme].palette;
    const size = 16;
    let cols: number[] = [];
    const resize = () => {
      cv.width = cv.clientWidth;
      cv.height = cv.clientHeight;
      cols = Array.from({ length: Math.ceil(cv.width / size) }, () => Math.random() * -50);
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, cv.width, cv.height);
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 45) return;
      last = t;
      ctx.fillStyle = `${p.bg}22`;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.font = `${size}px 'JetBrains Mono Variable', monospace`;
      cols.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        const x = i * size;
        ctx.fillStyle = Math.random() > 0.975 ? p.fg : i % 7 === 0 ? p.accent2 : p.accent;
        ctx.fillText(ch, x, y * size);
        cols[i] = y * size > cv.height && Math.random() > 0.975 ? 0 : y + 1;
      });
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);
  return <canvas ref={canvas} class="matrix" style={{ opacity }} aria-hidden="true" />;
}

export function Screensaver() {
  const state = useStore($saver);
  const now = useNow(1000);
  const [unlocking, setUnlocking] = useState(false);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (state === 'off') return;
    setUnlocking(false);
    setDots(0);
    let armed = false;
    const arm = setTimeout(() => (armed = true), 400);
    const wake = (e: Event) => {
      if (!armed) return;
      e.preventDefault();
      if ($saver.get() === 'saver') {
        $saver.set('off');
        return;
      }
      // Lock screen: "type" a password, then unlock.
      setUnlocking(true);
      let n = 0;
      const id = setInterval(() => {
        setDots(++n);
        if (n >= 8) {
          clearInterval(id);
          setTimeout(() => $saver.set('off'), 250);
        }
      }, 55);
    };
    window.addEventListener('keydown', wake, true);
    window.addEventListener('pointerdown', wake, true);
    if (state === 'saver') window.addEventListener('pointermove', wake, true);
    return () => {
      clearTimeout(arm);
      window.removeEventListener('keydown', wake, true);
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('pointermove', wake, true);
    };
  }, [state]);

  if (state === 'off') return null;
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div class={`saver ${state}`} role="dialog" aria-modal="true" aria-label={state === 'lock' ? 'Lock screen' : 'Screensaver'}>
      <MatrixRain opacity={state === 'lock' ? 0.35 : 1} />
      {state === 'lock' && (
        <div class="lock-card">
          <p class="lock-time">{time}</p>
          <p class="lock-date">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div class="avatar" aria-hidden="true">
            {site.handle.slice(0, 1).toUpperCase()}
          </div>
          <p class="lock-user mono">{site.user}</p>
          <div class={`lock-input mono${unlocking ? ' typing' : ''}`}>{unlocking ? '•'.repeat(dots) : 'press any key to unlock'}</div>
        </div>
      )}
    </div>
  );
}
