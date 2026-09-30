import { useEffect, useRef, useState } from 'preact/hooks';
import { site } from '../../config/site';
import { useData } from '../context';

type Phase = 'grub' | 'log' | 'login' | 'out';

/** GRUB → systemd log → SDDM-style login. Any key / click skips. */
export function Boot({ onDone }: { onDone: () => void }) {
  const data = useData();
  const [phase, setPhase] = useState<Phase>('grub');
  const [lines, setLines] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [pw, setPw] = useState(0);
  const done = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setPhase('out');
    setTimeout(onDone, 480);
  };

  const log = [
    'Booting `Bazzite 42 (lunaevolans)`',
    'Loading Linux 6.18.4-ba1.fc42.x86_64 …',
    'Loading initial ramdisk …',
    '[    0.000000] Linux version 6.18.4-ba1.fc42.x86_64 (mockbuild@bazzite) (gcc 15.2.1)',
    '[    0.412337] ACPI: Coffee Machine [CAFE] (on)',
    '[  OK  ] Reached target Local File Systems.',
    '[  OK  ] Started Journal Service.',
    '[  OK  ] Mounted /var/home.',
    `[  OK  ] Mounted /home/${site.user}/projects (${data.projects.length} entries).`,
    `[  OK  ] Mounted /home/${site.user}/blog (${data.posts.length} entries).`,
    `[  OK  ] Mounted /home/${site.user}/lab (${data.lab.length} notebooks).`,
    '[  OK  ] Started Network Manager.',
    '[  OK  ] Started OpenTelemetry Collector.',
    '[  OK  ] Started Kafka Broker (helios-0).',
    '[  OK  ] Started PostgreSQL 17 database server.',
    '[  OK  ] Started WebGL Wallpaper Daemon.',
    '[  OK  ] Started Hyprland Session Manager.',
    '[  OK  ] Reached target Graphical Interface.',
  ];

  useEffect(() => {
    root.current?.focus();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    at(900, () => setPhase('log'));
    log.forEach((l, i) => at(950 + i * 70, () => setLines((prev) => [...prev, l])));
    const loginAt = 950 + log.length * 70 + 250;
    at(loginAt, () => setPhase('login'));
    site.user.split('').forEach((_, i) => at(loginAt + 350 + i * 90, () => setTyped(site.user.slice(0, i + 1))));
    const pwAt = loginAt + 350 + site.user.length * 90 + 150;
    for (let i = 1; i <= 10; i++) at(pwAt + i * 45, () => setPw(i));
    at(pwAt + 10 * 45 + 450, finish);

    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === 'Tab' || e.key === 'Shift')) return;
      finish();
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, []);

  const now = new Date();
  return (
    <div
      ref={root}
      tabIndex={-1}
      class={`boot phase-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="Boot sequence. Press any key to skip."
    >
      {phase === 'grub' && (
        <div class="grub mono">
          <p class="grub-title">GNU GRUB version 2.12</p>
          <ul>
            <li class="on">*Bazzite 42 (lunaevolans) ostree:0</li>
            <li>Bazzite 42 (rollback) ostree:1</li>
            <li>UEFI Firmware Settings</li>
          </ul>
          <p class="grub-hint">The highlighted entry will be executed automatically in 1s.</p>
        </div>
      )}
      {phase === 'log' && (
        <pre class="bootlog mono" aria-hidden="true">
          {lines.map((l) =>
            l.startsWith('[  OK  ]') ? (
              <div>
                [<span class="ok"> OK </span>]{l.slice(8)}
              </div>
            ) : (
              <div class="dim">{l}</div>
            ),
          )}
        </pre>
      )}
      {(phase === 'login' || phase === 'out') && (
        <div class="login">
          <p class="login-time">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          <p class="login-date">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <div class="avatar big" aria-hidden="true">
            {site.handle.slice(0, 1).toUpperCase()}
          </div>
          <div class="login-field mono">
            {typed}
            {typed.length < site.user.length && <span class="caret" />}
          </div>
          <div class="login-field mono pw">
            {'•'.repeat(pw)}
            {typed.length === site.user.length && pw < 10 && <span class="caret" />}
          </div>
          <p class="login-session mono">Session: Hyprland · {site.hostname}</p>
        </div>
      )}
      <p class="boot-skip mono">press any key to skip</p>
    </div>
  );
}
