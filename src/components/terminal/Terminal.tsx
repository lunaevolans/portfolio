import '@xterm/xterm/css/xterm.css';
import { useStore } from '@nanostores/preact';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { useEffect, useRef } from 'preact/hooks';
import { site } from '../../config/site';
import { fetchGithub } from '../../lib/github';
import { c, Shell, type Effect } from '../../lib/shell/shell';
import { $mode, $saver, $theme, reboot, setTheme, toast } from '../../lib/stores';
import { themes, type ThemeId } from '../../lib/themes';
import { closeWindow } from '../../lib/wm/store';
import { useData, useLaunch } from '../context';
import { useMedia } from '../hooks';

function xtermTheme(id: ThemeId): ITheme {
  const p = themes[id].palette;
  return {
    background: '#00000000',
    foreground: p.fg,
    cursor: p.accent2,
    cursorAccent: p.surface,
    selectionBackground: `${p.accent}55`,
    black: p.overlay,
    red: p.red,
    green: p.green,
    yellow: p.yellow,
    blue: p.blue,
    magenta: p.accent,
    cyan: p.accent3,
    white: p.fg,
    brightBlack: p.muted,
    brightRed: p.red,
    brightGreen: p.green,
    brightYellow: p.yellow,
    brightBlue: p.blue,
    brightMagenta: p.accent2,
    brightCyan: p.accent3,
    brightWhite: p.fg,
  };
}

const CHIPS = ['help', 'ls', 'neofetch', 'projects', 'cat about.txt', 'gh', 'theme next', 'python', 'gui'];

const TRAIN = [
  '      ====        ________                ___________ ',
  '  _D _|  |_______/        \\__I_I_____===__|_________| ',
  '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
  '   /     |  |   H  |  |     |   |         ||_| |_||   ',
  '  |      |  |   H  |__--------------------| [___] |   ',
  '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
  '  |/ |   |-----------I_____I [][] []  D   |=======|__ ',
  '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ',
  ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
  '  \\_/      \\O=====O=====O=====O_/      \\_/            ',
];

const PANIC = [
  'Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000009',
  'CPU: 0 PID: 1 Comm: systemd Tainted: G        W  6.18.4-ba1.fc42.x86_64',
  'Call Trace:',
  ' <TASK>',
  ' dump_stack_lvl+0x47/0x60',
  ' panic+0x1a3/0x3d0',
  ' do_exit.cold+0x15/0x15',
  ' rm_rf_root+0xdead/0xbeef [portfolio]',
  ' </TASK>',
  '---[ end Kernel panic - not syncing: you really typed it, huh ]---',
];

export default function Terminal({ embedded = true, winId }: { embedded?: boolean; winId?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const term = useRef<XTerm | null>(null);
  const data = useData();
  const launch = useLaunch();
  const theme = useStore($theme);
  const mobile = useMedia('(max-width: 767px)');
  const typeRef = useRef<(s: string) => void>(() => {});

  useEffect(() => {
    if (term.current) term.current.options.theme = xtermTheme(theme);
  }, [theme]);

  useEffect(() => {
    let disposed = false;
    const el = host.current!;
    const xt = new XTerm({
      fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
      fontSize: mobile ? 12 : 13.5,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      allowProposedApi: true,
      scrollback: 3000,
      theme: xtermTheme($theme.get()),
      convertEol: true,
    });
    term.current = xt;
    const fit = new FitAddon();
    xt.loadAddon(fit);

    const shell = new Shell(data, {
      open: (app, opts) => {
        if (!embedded) $mode.set('gui');
        launch(app, opts);
      },
      setTheme: (id) => setTheme(id, false),
      themeId: () => $theme.get(),
      reboot: () => setTimeout(reboot, 600),
      lock: () => $saver.set('lock'),
      github: () => fetchGithub(site.github),
      resolution: () => `${screen.width}x${screen.height}`,
      embedded: () => embedded,
    });

    type Mode = 'shell' | 'busy' | 'python' | 'vim';
    let mode: Mode = 'shell';
    let buf = '';
    let cur = 0;
    let hist = -1;
    let pyBuf: string[] = [];
    let vimCmd: string | null = null;
    let vimTries = 0;
    const pending: string[] = [];

    const prompt = () => (mode === 'python' ? (pyBuf.length ? c.muted('... ') : c.yellow('>>> ')) : shell.prompt());
    const redraw = () => {
      xt.write(`\r\x1b[K${prompt()}${buf}`);
      const back = buf.length - cur;
      if (back > 0) xt.write(`\x1b[${back}D`);
    };
    const newPrompt = () => {
      buf = '';
      cur = 0;
      hist = -1;
      xt.write(`\r\n${prompt()}`);
      const next = pending.shift();
      if (next !== undefined) feed(next + '\r');
    };
    const println = (s: string) => s && xt.write(`\r\n${s.replace(/\n/g, '\r\n')}`);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const runEffect = async (e: Effect) => {
      switch (e.type) {
        case 'clear':
          xt.clear();
          xt.write('\x1b[2J\x1b[H');
          return 'noNewline';
        case 'gui':
          if (embedded && winId) closeWindow(winId);
          else $mode.set('gui');
          return;
        case 'cmatrix':
          $saver.set('saver');
          return;
        case 'sl': {
          const cols = xt.cols;
          xt.write('\x1b[?25l\r\n'.repeat(1));
          const top = xt.buffer.active.cursorY;
          for (let x = cols; x > -TRAIN[0]!.length; x -= 2) {
            if (disposed) return;
            let frame = '';
            TRAIN.forEach((line, i) => {
              const visible = x >= 0 ? line.slice(0, Math.max(0, cols - x)) : line.slice(-x, -x + cols);
              frame += `\x1b[${top + i + 1};1H\x1b[K${x > 0 ? ' '.repeat(x) : ''}${visible}`;
            });
            xt.write(frame);
            await sleep(28);
          }
          xt.write(`\x1b[${top + TRAIN.length + 1};1H\x1b[?25h`);
          println(c.muted('(you meant ls)'));
          return;
        }
        case 'panic': {
          mode = 'busy';
          xt.write('\r\n');
          for (const l of PANIC) {
            xt.write(`\r\n${c.red(l)}`);
            await sleep(90);
          }
          await sleep(1400);
          println(c.yellow('Rebooting in 3… 2… 1…'));
          await sleep(900);
          reboot();
          return;
        }
        case 'vim': {
          mode = 'vim';
          vimCmd = null;
          const name = e.file ?? '[No Name]';
          const node = e.file ? shell.resolve(e.file).node : null;
          const content = node && node.type === 'file' ? node.content.split('\n') : [];
          xt.write('\x1b[2J\x1b[H');
          const rows = xt.rows;
          for (let i = 0; i < rows - 1; i++) xt.write(`${i < content.length ? content[i]!.slice(0, xt.cols) : c.accent('~')}\r\n`);
          xt.write(c.bold(`"${name}" ${content.length}L [readonly]`) + c.muted('   (type :q and Enter to quit... if you can)'));
          return 'noNewline';
        }
        case 'python': {
          mode = 'busy';
          println(c.muted('Starting CPython (WebAssembly via Pyodide)…'));
          try {
            const { loadPython } = await import('../../lib/pyodide');
            await loadPython((m) => println(c.muted(m)));
            println('Python 3 (Pyodide) on WebAssembly');
            println(c.muted('Type "exit()" or press Ctrl+D to return to lsh. numpy/pandas load on import.'));
            mode = 'python';
          } catch (err) {
            println(c.red(`python: failed to start: ${err instanceof Error ? err.message : String(err)}`));
            mode = 'shell';
          }
          return;
        }
      }
    };

    const exec = async (line: string) => {
      mode = 'busy';
      const r = await shell.exec(line);
      mode = 'shell';
      println(r.out);
      if (r.effect) {
        const res = await runEffect(r.effect);
        if (disposed) return;
        if (res === 'noNewline') {
          if (mode === 'shell') {
            xt.write(prompt());
            buf = '';
            cur = 0;
          }
          return;
        }
        if ((mode as Mode) === 'busy') return; // e.g. panic → rebooting
        if ((mode as Mode) === 'python') {
          xt.write(`\r\n${prompt()}`);
          buf = '';
          cur = 0;
          return;
        }
      }
      newPrompt();
    };

    const execPython = async (line: string) => {
      const trimmed = line.trim();
      if (!pyBuf.length && /^(exit|quit)\(\)$/.test(trimmed)) {
        mode = 'shell';
        return newPrompt();
      }
      const continues = pyBuf.length ? trimmed !== '' : /:\s*$/.test(trimmed);
      pyBuf.push(line);
      if (continues) {
        buf = '';
        cur = 0;
        xt.write(`\r\n${prompt()}`);
        return;
      }
      const code = pyBuf.join('\n');
      pyBuf = [];
      mode = 'busy';
      const { runPython } = await import('../../lib/pyodide');
      const r = await runPython(code);
      mode = 'python';
      println(r.stdout.trimEnd());
      if (r.result !== null && r.result !== 'undefined') println(r.result);
      if (r.stderr) println(c.red(r.stderr.trimEnd()));
      newPrompt();
    };

    const vimKey = (d: string) => {
      const status = (s: string) => xt.write(`\x1b[${xt.rows};1H\x1b[K${s}`);
      if (d === '\x03') return status(c.muted('Type  :qa!  and press <Enter> to abandon all changes and exit Vim'));
      if (vimCmd === null) {
        if (d === ':') {
          vimCmd = '';
          status(':');
        }
        return;
      }
      if (d === '\x1b') {
        vimCmd = null;
        return status('');
      }
      if (d === '\x7f') {
        vimCmd = vimCmd.slice(0, -1);
        return status(`:${vimCmd}`);
      }
      if (d === '\r') {
        const cmd = vimCmd.trim();
        vimCmd = null;
        if (/^(q|wq|x|qa)!?$/.test(cmd) && (cmd.endsWith('!') || vimTries > 0)) {
          mode = 'shell';
          xt.write('\x1b[2J\x1b[H');
          xt.write(c.green('✓ You exited vim. Put that on the résumé.'));
          toast('Achievement unlocked', 'Exited vim', 'ok');
          return newPrompt();
        }
        if (/^(q|wq|x|qa)$/.test(cmd)) {
          vimTries++;
          return status(c.red('E37: No write since last change (add ! to override)'));
        }
        if (/^w/.test(cmd)) return status(c.red("E45: 'readonly' option is set (add ! to override)"));
        return status(c.red(`E492: Not an editor command: ${cmd}`));
      }
      if (d.length === 1 && d >= ' ') {
        vimCmd += d;
        status(`:${vimCmd}`);
      }
    };

    const feed = (d: string) => {
      if (mode === 'vim') {
        for (const ch of d.match(/\x1b\[[A-D]|./gs) ?? []) vimKey(ch);
        return;
      }
      if (mode === 'busy') {
        if (d === '\x03') xt.write('^C');
        return;
      }
      // Pasted multi-line input: run line by line.
      if (d.length > 1 && /[\r\n]/.test(d) && !d.startsWith('\x1b')) {
        const lines = d.split(/\r\n|\r|\n/);
        const first = lines.shift() ?? '';
        buf = buf.slice(0, cur) + first + buf.slice(cur);
        cur += first.length;
        pending.push(...lines.filter((l, i) => l || i < lines.length - 1));
        return feed('\r');
      }
      switch (d) {
        case '\r': {
          const line = buf;
          if (mode === 'python') return void execPython(line);
          return void exec(line);
        }
        case '\x7f':
        case '\b':
          if (cur > 0) {
            buf = buf.slice(0, cur - 1) + buf.slice(cur);
            cur--;
            redraw();
          }
          return;
        case '\x1b[3~':
          if (cur < buf.length) {
            buf = buf.slice(0, cur) + buf.slice(cur + 1);
            redraw();
          }
          return;
        case '\x1b[A':
        case '\x1b[B': {
          if (mode !== 'shell' || !shell.history.length) return;
          const h = shell.history;
          hist = d === '\x1b[A' ? (hist < 0 ? h.length - 1 : Math.max(0, hist - 1)) : hist < 0 ? -1 : hist + 1;
          if (hist >= h.length) hist = -1;
          buf = hist < 0 ? '' : h[hist]!;
          cur = buf.length;
          redraw();
          return;
        }
        case '\x1b[C':
          if (cur < buf.length) {
            cur++;
            xt.write(d);
          }
          return;
        case '\x1b[D':
          if (cur > 0) {
            cur--;
            xt.write(d);
          }
          return;
        case '\x1b[H':
        case '\x01':
          cur = 0;
          return redraw();
        case '\x1b[F':
        case '\x05':
          cur = buf.length;
          return redraw();
        case '\x03':
          xt.write('^C');
          pyBuf = [];
          return newPrompt();
        case '\x04':
          if (mode === 'python' && !buf) {
            mode = 'shell';
            return newPrompt();
          }
          return;
        case '\x0c':
          xt.clear();
          return redraw();
        case '\x15':
          buf = buf.slice(cur);
          cur = 0;
          return redraw();
        case '\x17': {
          const left = buf.slice(0, cur).replace(/\S+\s*$/, '');
          buf = left + buf.slice(cur);
          cur = left.length;
          return redraw();
        }
        case '\t': {
          if (mode === 'python') {
            buf = buf.slice(0, cur) + '    ' + buf.slice(cur);
            cur += 4;
            return redraw();
          }
          const { line, options } = shell.complete(buf.slice(0, cur));
          if (options.length > 1) {
            xt.write(`\r\n${options.map((o) => c.accent(o)).join('  ')}`);
            xt.write(`\r\n`);
          }
          buf = line + buf.slice(cur);
          cur = line.length;
          return redraw();
        }
      }
      if (d.startsWith('\x1b')) return;
      const printable = d.replace(/[\x00-\x1f]/g, '');
      if (!printable) return;
      buf = buf.slice(0, cur) + printable + buf.slice(cur);
      cur += printable.length;
      if (cur === buf.length) xt.write(printable);
      else redraw();
    };
    typeRef.current = (s: string) => {
      if (mode === 'shell' || mode === 'python') {
        buf = '';
        cur = 0;
        redraw();
        feed(s);
        feed('\r');
      }
      xt.focus();
    };

    (async () => {
      try {
        await document.fonts.load("13px 'JetBrains Mono Variable'");
      } catch {
        /* fall back to whatever is available */
      }
      if (disposed) return;
      xt.open(el);
      try {
        fit.fit();
      } catch {
        /* not visible yet */
      }
      xt.onData(feed);
      xt.write(shell.motd().replace(/\n/g, '\r\n'));
      if (!embedded) {
        const r = await shell.exec('neofetch');
        xt.write(r.out.replace(/\n/g, '\r\n') + '\r\n');
      }
      xt.write(`\r\n${prompt()}`);
      if (!embedded || !matchMedia('(max-width: 767px)').matches) xt.focus();
    })();

    const ro = new ResizeObserver(() => {
      try {
        if (el.clientWidth > 0) fit.fit();
      } catch {
        /* ignore */
      }
    });
    ro.observe(el);

    return () => {
      disposed = true;
      ro.disconnect();
      xt.dispose();
      term.current = null;
    };
  }, []);

  return (
    <div class={`term${embedded ? ' embedded' : ' fullscreen'}`}>
      {!embedded && (
        <div class="tty-bar mono">
          <span>
            tty1 · {site.user}@{site.hostname}
          </span>
          <button type="button" class="btn small" onClick={() => $mode.set('gui')}>
            back to GUI <kbd>gui</kbd>
          </button>
        </div>
      )}
      <div ref={host} class="term-host" onClick={() => term.current?.focus()} />
      {(mobile || !embedded) && (
        <div class="term-chips" aria-label="Quick commands">
          {CHIPS.map((cmd) => (
            <button type="button" class="chip" onClick={() => typeRef.current(cmd)}>
              {cmd}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
