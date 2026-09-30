import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { isAppId, type AppId } from '../../lib/apps';
import { $booted, $mode, $reducedMotion, $saver, hasBootedThisSession, hydrateTheme, markBooted, toast } from '../../lib/stores';
import type { PortfolioData } from '../../lib/types';
import { handleKeybind } from '../../lib/wm/keybinds';
import { initWorkspaces, openApp, type OpenOptions } from '../../lib/wm/store';
import ShaderWallpaper from '../bg/ShaderWallpaper';
import { DataContext, LaunchContext } from '../context';
import { useMedia, useMounted } from '../hooks';
import { Lazy } from '../Lazy';
import MobileShell, { $mobileApp } from '../mobile/MobileShell';
import { Boot } from './Boot';
import { Cheatsheet } from './Cheatsheet';
import { Launcher } from './Launcher';
import { Screensaver } from './Screensaver';
import { Toasts } from './Toasts';
import { TopBar } from './TopBar';
import { Workspaces } from './Workspaces';

const IDLE_MS = 3 * 60 * 1000;

// Populate the WM synchronously so the server render already has windows.
initWorkspaces();

export default function Desktop({ data }: { data: PortfolioData }) {
  const booted = useStore($booted);
  const mode = useStore($mode);
  const mounted = useMounted();
  const mobile = useMedia('(max-width: 767px)');
  const [ttyKey, setTtyKey] = useState(0);

  // Mobile opens apps as full-screen sheets; desktop opens windows.
  const launch = (app: AppId, opts?: OpenOptions) => {
    if ($mode.get() === 'tty') $mode.set('gui');
    if (matchMedia('(max-width: 767px)').matches) $mobileApp.set({ app, opts });
    else openApp(app, opts);
  };

  useEffect(() => {
    hydrateTheme();
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const setRm = () => $reducedMotion.set(rm.matches);
    setRm();
    rm.addEventListener('change', setRm);

    const params = new URLSearchParams(location.search);
    const deepApp = params.get('app');
    const deepMode = params.get('mode');
    const forceBoot = params.has('boot');
    if (!forceBoot && (hasBootedThisSession() || rm.matches || deepApp || deepMode || navigator.webdriver)) markBooted();
    if (deepMode === 'tty') $mode.set('tty');
    if (isAppId(deepApp)) {
      const slug = params.get('slug') ?? undefined;
      launch(deepApp, slug ? { key: slug, props: { slug } } : undefined);
    }

    const onKey = (e: KeyboardEvent) => {
      if (!$booted.get()) return;
      if (handleKeybind(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);

    let idle: ReturnType<typeof setTimeout>;
    const bump = () => {
      clearTimeout(idle);
      idle = setTimeout(() => $booted.get() && $saver.get() === 'off' && $saver.set('saver'), IDLE_MS);
    };
    bump();
    const events = ['pointermove', 'keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));

    // Konami code → party mode
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    const konami = (e: KeyboardEvent) => {
      pos = e.key === seq[pos] ? pos + 1 : e.key === seq[0] ? 1 : 0;
      if (pos === seq.length) {
        pos = 0;
        document.documentElement.classList.toggle('party');
        toast('↑↑↓↓←→←→BA', 'Party mode toggled. RGB is a performance feature.', 'ok');
      }
    };
    window.addEventListener('keydown', konami);

    document.documentElement.classList.add('js-ready');
    return () => {
      rm.removeEventListener('change', setRm);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', konami);
      events.forEach((ev) => window.removeEventListener(ev, bump));
      clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    if (!booted) return;
    document.documentElement.dataset.booted = '1';
    const first = !sessionStorage.getItem('luna.welcomed');
    if (first) {
      try {
        sessionStorage.setItem('luna.welcomed', '1');
      } catch {
        /* ignore */
      }
      setTimeout(
        () =>
          toast(
            'Welcome to lunaevolans.github.io',
            'Ctrl+K opens the launcher, ? shows keybinds, and “tty” in the bar opens a real shell.',
            'info',
            7000,
          ),
        900,
      );
    }
  }, [booted]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    if (mode === 'tty') setTtyKey((k) => k + 1);
  }, [mode]);

  return (
    <DataContext.Provider value={data}>
      <LaunchContext.Provider value={launch}>
        <a class="skip-link" href="#desktop">
          Skip to content
        </a>
        {mounted && <ShaderWallpaper />}
        <div class={`shell-root${mode === 'tty' ? ' is-tty' : ''}`}>
          {mounted && mobile ? (
            <MobileShell />
          ) : (
            <>
              <TopBar />
              <Workspaces />
            </>
          )}
        </div>
        {mounted && mode === 'tty' && (
          <div class="tty" role="application" aria-label="Terminal mode">
            <Lazy key={ttyKey} load={() => import('../terminal/Terminal')} props={{ embedded: false }} label="switching to tty1" />
          </div>
        )}
        <Launcher onOpenApp={launch} />
        <Cheatsheet />
        <Toasts />
        <Screensaver />
        {!booted && <Boot onDone={markBooted} />}
      </LaunchContext.Provider>
    </DataContext.Provider>
  );
}
