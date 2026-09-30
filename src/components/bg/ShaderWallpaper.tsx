import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $reducedMotion, $theme } from '../../lib/stores';
import { hexToRgb, themes } from '../../lib/themes';

const vertex = /* glsl */ `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

/**
 * Domain-warped fbm "aurora" + a perspective dot grid, coloured by the active
 * palette. Colours ease towards the target palette when the theme changes.
 */
const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform vec3 uBg;
uniform vec3 uA1;
uniform vec3 uA2;
uniform vec3 uA3;
uniform float uDark;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.045;
  vec2 m = (uMouse - 0.5) * 0.25;

  vec2 q = vec2(fbm(p * 1.4 + t + m), fbm(p * 1.4 - t + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7, 9.2) + 0.6 * t), fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8) - 0.4 * t));
  float f = fbm(p * 1.2 + 2.6 * r);

  vec3 col = uBg;
  float intensity = mix(0.55, 0.9, uDark);
  col = mix(col, uA1, smoothstep(0.35, 0.95, f) * 0.42 * intensity);
  col = mix(col, uA2, smoothstep(0.45, 1.0, length(q)) * 0.30 * intensity);
  col = mix(col, uA3, smoothstep(0.55, 1.0, r.x) * 0.20 * intensity);

  // aurora band
  float band = exp(-pow((uv.y - 0.72 - 0.08 * sin(p.x * 2.2 + t * 6.0)) * 5.0, 2.0));
  col += mix(uA1, uA3, uv.x) * band * 0.10 * intensity;

  // perspective dot grid on the lower third
  float horizon = 0.38;
  if (uv.y < horizon) {
    float depth = (horizon - uv.y) / horizon;
    vec2 g = vec2(p.x / (1.0 - depth * 0.85 + 0.05), 1.0 / (depth + 0.05) + uTime * 0.35);
    vec2 cell = abs(fract(g * vec2(9.0, 1.2)) - 0.5);
    float dotv = smoothstep(0.08, 0.0, length(cell * vec2(1.0, 0.45)));
    col += uA1 * dotv * depth * 0.22 * intensity;
  }

  // mouse glow + vignette
  float glow = exp(-length(uv - uMouse) * 4.5);
  col += uA2 * glow * 0.06;
  col *= mix(1.0, smoothstep(1.25, 0.35, length(uv - 0.5)), 0.55);

  // subtle film grain
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;

const RENDER_SCALE = 0.6;
const FRAME_MS = 1000 / 31;

export default function ShaderWallpaper() {
  const host = useRef<HTMLDivElement>(null);
  const theme = useStore($theme);
  const reduced = useStore($reducedMotion);
  const target = useRef(themes[theme].palette);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    target.current = themes[theme].palette;
    kick.current();
  }, [theme]);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    (async () => {
      // Let the desktop become interactive first; the wallpaper is decoration.
      await new Promise<void>((r) =>
        'requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 2500 }) : setTimeout(r, 1200),
      );
      const { Renderer, Program, Mesh, Triangle } = await import('ogl');
      if (disposed || !host.current) return;
      let renderer: InstanceType<typeof Renderer>;
      try {
        renderer = new Renderer({
          // The aurora is soft: render at ~60% resolution and let CSS upscale it.
          dpr: Math.min(window.devicePixelRatio, 1.5) * RENDER_SCALE,
          alpha: false,
          antialias: false,
          powerPreference: 'low-power',
        });
      } catch {
        host.current.classList.add('no-webgl');
        return;
      }
      const gl = renderer.gl;
      const canvas = gl.canvas as HTMLCanvasElement;
      // Software rasterisers (no GPU, e.g. CI or VMs) get a single static frame.
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      let degraded = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);
      canvas.setAttribute('aria-hidden', 'true');
      host.current.appendChild(canvas);

      const start = themes[theme].palette;
      const cur = {
        bg: hexToRgb(start.bg),
        a1: hexToRgb(start.accent),
        a2: hexToRgb(start.accent2),
        a3: hexToRgb(start.accent3),
        dark: themes[theme].dark ? 1 : 0,
      };
      const program = new Program(gl, {
        vertex,
        fragment,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: [1, 1] },
          uMouse: { value: [0.5, 0.6] },
          uBg: { value: cur.bg },
          uA1: { value: cur.a1 },
          uA2: { value: cur.a2 },
          uA3: { value: cur.a3 },
          uDark: { value: cur.dark },
        },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        program.uniforms.uRes!.value = [gl.canvas.width, gl.canvas.height];
      };
      resize();
      window.addEventListener('resize', resize);

      const mouse = { x: 0.5, y: 0.6, tx: 0.5, ty: 0.6 };
      const onMove = (e: PointerEvent) => {
        mouse.tx = e.clientX / window.innerWidth;
        mouse.ty = 1 - e.clientY / window.innerHeight;
      };
      window.addEventListener('pointermove', onMove, { passive: true });

      const lerp3 = (a: [number, number, number], b: [number, number, number], k: number) => {
        a[0] += (b[0] - a[0]) * k;
        a[1] += (b[1] - a[1]) * k;
        a[2] += (b[2] - a[2]) * k;
      };

      let last = performance.now();
      let time = 20;
      let slow = 0;
      const frame = (now: number) => {
        // Cap at ~30fps: the motion is slow, so this halves GPU cost for free.
        if (now - last < FRAME_MS) {
          raf = requestAnimationFrame(frame);
          return;
        }
        const gap = now - last;
        const dt = Math.min(0.05, gap / 1000);
        last = now;
        // Adaptive quality: if the device can't keep ~15fps, stop animating.
        slow = gap > 70 && !document.hidden ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 24) degraded = true;
        const staticMode = $reducedMotion.get() || degraded;
        if (!staticMode) time += dt;
        const p = target.current;
        const k = staticMode ? 1 : Math.min(1, dt * 3);
        lerp3(cur.bg, hexToRgb(p.bg), k);
        lerp3(cur.a1, hexToRgb(p.accent), k);
        lerp3(cur.a2, hexToRgb(p.accent2), k);
        lerp3(cur.a3, hexToRgb(p.accent3), k);
        const dark = themes[$theme.get()].dark ? 1 : 0;
        cur.dark += (dark - cur.dark) * k;
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;
        program.uniforms.uTime!.value = time;
        program.uniforms.uMouse!.value = [mouse.x, mouse.y];
        program.uniforms.uDark!.value = cur.dark;
        renderer.render({ scene: mesh });
        const settling = Math.abs(cur.a1[0] - hexToRgb(p.accent)[0]) + Math.abs(cur.bg[2] - hexToRgb(p.bg)[2]) > 0.003;
        if (!document.hidden && (!staticMode || settling)) raf = requestAnimationFrame(frame);
        else raf = 0;
      };
      const wake = () => {
        if (!raf && !document.hidden) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      };
      kick.current = wake;
      document.addEventListener('visibilitychange', wake);
      raf = requestAnimationFrame(frame);
      host.current.classList.add('ready');

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', wake);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => kick.current(), [reduced]);

  return <div ref={host} class="wallpaper" aria-hidden="true" />;
}
