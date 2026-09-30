import { site, skills } from '../../config/site';
import { apps, isAppId, type AppId } from '../apps';
import { LOGO, neofetchRows } from '../neofetch';
import { themes, themeIds, isThemeId, type ThemeId } from '../themes';
import type { GithubSummary } from '../github';
import { timeAgo } from '../github';
import type { PortfolioData } from '../types';
import type { OpenOptions } from '../wm/store';
import { HOME, buildFs } from './fs';
import { parse, ParseError } from './parser';
import { basename, lookup, normalize, tildify, type VDir, type VNode } from './vfs';

/* ── ANSI helpers ──────────────────────────────────────────────────────────── */
const esc = (code: string) => (s: string | number) => `\x1b[${code}m${s}\x1b[0m`;
export const c = {
  bold: esc('1'),
  dim: esc('2'),
  italic: esc('3'),
  red: esc('31'),
  green: esc('32'),
  yellow: esc('33'),
  blue: esc('34'),
  accent: esc('35'),
  cyan: esc('36'),
  muted: esc('90'),
  pink: esc('95'),
};
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

/* ── Types ─────────────────────────────────────────────────────────────────── */
export type Effect =
  | { type: 'clear' }
  | { type: 'gui' }
  | { type: 'python' }
  | { type: 'sl' }
  | { type: 'cmatrix' }
  | { type: 'panic' }
  | { type: 'vim'; file?: string };

export interface ShellHost {
  open(app: AppId, opts?: OpenOptions): void;
  setTheme(id: ThemeId): void;
  themeId(): ThemeId;
  reboot(): void;
  lock(): void;
  github(): Promise<GithubSummary>;
  resolution(): string;
  /** Whether the shell runs inside a GUI window (vs. full-screen TTY). */
  embedded(): boolean;
}

export interface ExecResult {
  out: string;
  code: number;
  effect?: Effect;
}

class CmdError extends Error {}

interface Ctx {
  args: string[];
  stdin: string;
  piped: boolean;
  sh: Shell;
  effect(e: Effect): void;
}

interface CommandDef {
  desc: string;
  usage?: string;
  hidden?: boolean;
  run(ctx: Ctx): string | Promise<string>;
}

const FORTUNES = [
  'There are two hard problems in distributed systems: 2. exactly-once delivery 1. guaranteed order 2. exactly-once delivery',
  'It works on my machine. — Every container ever, before containers',
  'A monolith you understand beats microservices you do not.',
  'The best time to add observability was before the incident. The second best time is now.',
  'Premature optimization is the root of all evil. Premature abstraction is its cousin.',
  "Correlation isn't causation, but it sure is a hint.",
  'rpm-ostree rollback: the undo button Linux always deserved.',
  'All models are wrong, but some are useful. — George Box',
  'Weeks of coding can save you hours of planning.',
];

function cowsay(text: string) {
  const width = Math.min(40, Math.max(...text.split('\n').map((l) => l.length)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      lines.push(cur.trim());
      cur = w;
    } else cur += ` ${w}`;
  }
  if (cur.trim()) lines.push(cur.trim());
  const max = Math.max(...lines.map((l) => l.length));
  const border = (ch: string) => ` ${ch.repeat(max + 2)}`;
  const body =
    lines.length === 1
      ? [`< ${lines[0]} >`]
      : lines.map((l, i) => {
          const [a, b] = i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|'];
          return `${a} ${l.padEnd(max)} ${b}`;
        });
  return [
    border('_'),
    ...body,
    border('-'),
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ].join('\n');
}

/* ── Shell ─────────────────────────────────────────────────────────────────── */
export class Shell {
  cwd = HOME;
  readonly home = HOME;
  readonly history: string[] = [];
  readonly env: Record<string, string>;
  readonly fs: VDir;
  readonly commands: Record<string, CommandDef>;
  private aliases: Record<string, string> = {
    ll: 'ls -la',
    la: 'ls -a',
    btop: 'top',
    htop: 'top',
    nvim: 'vim',
    vi: 'vim',
    python3: 'python',
    neovim: 'vim',
  };

  constructor(
    readonly data: PortfolioData,
    readonly host: ShellHost,
  ) {
    this.commands = this.defineCommands();
    this.fs = buildFs(
      data,
      Object.keys(this.commands).filter((k) => !this.commands[k]?.hidden),
    );
    this.env = {
      USER: site.user,
      HOME,
      HOSTNAME: site.hostname,
      SHELL: '/usr/bin/lsh',
      TERM: 'xterm-256color',
      EDITOR: 'nvim',
      XDG_CURRENT_DESKTOP: 'Hyprland',
      PATH: '/usr/local/bin:/usr/bin',
    };
  }

  prompt(): string {
    const path = tildify(this.cwd, this.home);
    return `${c.accent(`${site.user}@${site.hostname}`)} ${c.cyan(path)} ${c.pink('❯')} `;
  }

  motd(): string {
    return [
      c.bold(`Bazzite 42 · lsh 1.0 · ${site.handle}.github.io`),
      c.muted(
        `Type ${c.accent('help')}${c.muted(' for commands, ')}${c.accent('gui')}${c.muted(' for the desktop, Tab to autocomplete.')}`,
      ),
      '',
    ].join('\n');
  }

  resolve(path: string): { abs: string; node: VNode | null } {
    const abs = normalize(path, this.cwd, this.home);
    return { abs, node: lookup(this.fs, abs) };
  }

  private expand(word: string): string {
    return word.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, a: string | undefined, b: string | undefined) => this.env[(a ?? b) as string] ?? '');
  }

  async exec(line: string): Promise<ExecResult> {
    const trimmed = line.trim();
    if (!trimmed) return { out: '', code: 0 };
    if (this.history[this.history.length - 1] !== trimmed) this.history.push(trimmed);

    let steps;
    try {
      steps = parse(trimmed);
    } catch (e) {
      return { out: c.red(`lsh: ${e instanceof ParseError ? e.message : String(e)}`), code: 2 };
    }

    let out = '';
    let code = 0;
    let effect: Effect | undefined;
    for (const step of steps) {
      if (step.op === '&&' && code !== 0) continue;
      if (step.op === '||' && code === 0) continue;
      let stdin = '';
      for (let i = 0; i < step.pipeline.length; i++) {
        const cmd = step.pipeline[i]!;
        let name = cmd.name;
        let args = cmd.args.map((a) => this.expand(a));
        const alias = this.aliases[name];
        if (alias) {
          const [an, ...aargs] = alias.split(' ') as [string, ...string[]];
          name = an;
          args = [...aargs, ...args];
        }
        const def = this.commands[name];
        const last = i === step.pipeline.length - 1;
        if (!def) {
          stdin =
            c.red(`lsh: command not found: ${name}`) +
            (this.suggest(name) ? c.muted(`  (did you mean ${c.accent(this.suggest(name)!)}${c.muted('?)')}`) : '');
          code = 127;
          break;
        }
        try {
          stdin = await def.run({
            args,
            stdin,
            piped: !last,
            sh: this,
            effect: (e) => (effect = e),
          });
          code = 0;
        } catch (e) {
          stdin = c.red(`${name}: ${e instanceof Error ? e.message : String(e)}`);
          code = 1;
          break;
        }
      }
      if (stdin) out += (out ? '\n' : '') + stdin;
    }
    return { out, code, effect };
  }

  /** Closest command by edit distance, for typos. */
  suggest(name: string): string | null {
    let best: string | null = null;
    let bestD = 3;
    for (const k of Object.keys(this.commands)) {
      if (this.commands[k]?.hidden) continue;
      const d = editDistance(name, k);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  }

  /** Tab completion: returns the completed line and the candidates. */
  complete(line: string): { line: string; options: string[] } {
    const m = /^(.*?)(\S*)$/.exec(line)!;
    const before = m[1] ?? '';
    const word = m[2] ?? '';
    const isCommand = !before.trim() || /[|;&]\s*$/.test(before);

    let candidates: string[];
    if (isCommand) {
      candidates = [...Object.keys(this.commands).filter((k) => !this.commands[k]?.hidden), ...Object.keys(this.aliases)]
        .filter((k) => k.startsWith(word))
        .sort();
    } else if (/^(theme)\s+$/.test(before)) {
      candidates = ['list', 'next', ...themeIds].filter((t) => t.startsWith(word));
    } else if (/^(open)\s+$/.test(before) && !word.includes('/')) {
      const appNames = (Object.keys(apps) as AppId[]).filter((a) => apps[a].launchable);
      candidates = [...appNames, ...this.pathCandidates(word)].filter((t) => t.startsWith(word));
    } else {
      candidates = this.pathCandidates(word);
    }

    candidates = [...new Set(candidates)];
    if (candidates.length === 1) {
      const only = candidates[0]!;
      const suffix = only.endsWith('/') ? '' : ' ';
      return { line: before + only + suffix, options: [] };
    }
    if (candidates.length > 1) {
      const prefix = commonPrefix(candidates);
      return { line: before + (prefix.length > word.length ? prefix : word), options: candidates };
    }
    return { line, options: [] };
  }

  private pathCandidates(word: string): string[] {
    const slash = word.lastIndexOf('/');
    const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
    const base = slash >= 0 ? word.slice(slash + 1) : word;
    const node = lookup(this.fs, normalize(dirPart || '.', this.cwd, this.home));
    if (!node || node.type !== 'dir') return [];
    return Object.entries(node.children)
      .filter(([n]) => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.')))
      .map(([n, v]) => dirPart + n + (v.type === 'dir' ? '/' : ''))
      .sort();
  }

  /* ── Command table ───────────────────────────────────────────────────────── */
  private defineCommands(): Record<string, CommandDef> {
    // Command closures read `sh` for brevity; they run long after construction.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const sh = this;
    const readFile = (path: string): string => {
      const { node } = sh.resolve(path);
      if (!node) throw new CmdError(`${path}: No such file or directory`);
      if (node.type === 'dir') throw new CmdError(`${path}: Is a directory`);
      if (path.endsWith('.pdf')) throw new CmdError(`${path}: binary file. Try \`open ${path}\``);
      return node.content;
    };
    const input = (ctx: Ctx) =>
      ctx.args.filter((a) => !a.startsWith('-')).length
        ? ctx.args
            .filter((a) => !a.startsWith('-'))
            .map(readFile)
            .join('\n')
        : ctx.stdin;
    const openApp = (app: AppId, opts?: OpenOptions) => {
      sh.host.open(app, opts);
      return c.muted(`→ opened ${apps[app].path}${sh.host.embedded() ? '' : ' (switching to GUI)'}`);
    };

    const cmds: Record<string, CommandDef> = {
      help: {
        desc: 'list commands',
        run: () => {
          const groups: [string, string[]][] = [
            ['navigate', ['ls', 'cd', 'pwd', 'tree', 'cat', 'open', 'less', 'head', 'tail', 'grep', 'wc', 'echo', 'find']],
            [
              'portfolio',
              ['neofetch', 'whoami', 'projects', 'blog', 'lab', 'skills', 'experience', 'resume', 'contact', 'gh', 'architecture'],
            ],
            ['desktop', ['gui', 'theme', 'top', 'lock', 'reboot', 'clear', 'history']],
            ['system', ['uname', 'date', 'uptime', 'env', 'which', 'man', 'python', 'ujust', 'hyprctl', 'rpm-ostree']],
            ['fun', ['fortune', 'cowsay', 'sl', 'cmatrix', 'vim', 'sudo', 'make', 'coffee']],
          ];
          return [
            ...groups.map(([g, list]) => `${c.pink(g.padEnd(10))} ${list.map((n) => c.accent(n)).join(c.muted(' · '))}`),
            '',
            c.muted('man <cmd> for details · pipes (|), && and ; work · Tab completes · ↑/↓ history'),
          ].join('\n');
        },
      },
      man: {
        desc: 'show a command manual',
        usage: 'man <command>',
        run: ({ args }) => {
          const name = args[0];
          if (!name) throw new CmdError('What manual page do you want?');
          const def = cmds[name] ?? cmds[sh.aliases[name]?.split(' ')[0] ?? ''];
          if (!def) throw new CmdError(`No manual entry for ${name}`);
          return [
            c.bold(`${name.toUpperCase()}(1)`),
            '',
            c.bold('NAME'),
            `    ${name} - ${def.desc}`,
            '',
            c.bold('SYNOPSIS'),
            `    ${def.usage ?? name}`,
          ].join('\n');
        },
      },
      ls: {
        desc: 'list directory contents',
        usage: 'ls [-la] [path…]',
        run: ({ args }) => {
          const flags = args.filter((a) => a.startsWith('-')).join('');
          const all = flags.includes('a');
          const long = flags.includes('l');
          const paths = args.filter((a) => !a.startsWith('-'));
          const targets = paths.length ? paths : ['.'];
          return targets
            .map((p) => {
              const { node } = sh.resolve(p);
              if (!node) throw new CmdError(`cannot access '${p}': No such file or directory`);
              if (node.type === 'file') return p;
              const entries = Object.entries(node.children).filter(([n]) => all || !n.startsWith('.'));
              const fmt = ([n, v]: [string, VNode]) =>
                v.type === 'dir'
                  ? c.bold(c.blue(`${n}/`))
                  : v.type === 'file' && v.exec
                    ? c.green(n)
                    : n.endsWith('.md')
                      ? c.cyan(n)
                      : n.endsWith('.pdf') || n.endsWith('.ipynb')
                        ? c.pink(n)
                        : n;
              const listing = long
                ? entries
                    .map(([n, v]) => {
                      const size = v.type === 'file' ? v.content.length : 4096;
                      const perm = v.type === 'dir' ? 'drwxr-xr-x' : v.type === 'file' && v.exec ? '-rwxr-xr-x' : '-rw-r--r--';
                      return `${c.muted(perm)} ${site.user} ${String(size).padStart(6)} ${c.muted('Sep 30')} ${fmt([n, v])}`;
                    })
                    .join('\n')
                : entries.map(fmt).join('  ');
              return targets.length > 1 ? `${p}:\n${listing}` : listing;
            })
            .join('\n\n');
        },
      },
      cd: {
        desc: 'change directory',
        usage: 'cd [path]',
        run: ({ args }) => {
          const target = args[0] ?? '~';
          const { abs, node } = sh.resolve(target === '-' ? (sh.env.OLDPWD ?? sh.cwd) : target);
          if (!node) throw new CmdError(`no such file or directory: ${target}`);
          if (node.type !== 'dir') throw new CmdError(`not a directory: ${target}`);
          sh.env.OLDPWD = sh.cwd;
          sh.cwd = abs;
          return '';
        },
      },
      pwd: { desc: 'print working directory', run: () => sh.cwd },
      cat: {
        desc: 'print files',
        usage: 'cat <file…>',
        run: (ctx) => {
          if (!ctx.args.length && !ctx.stdin) throw new CmdError('missing file operand');
          return input(ctx);
        },
      },
      less: { desc: 'view a file (it is cat, honestly)', usage: 'less <file>', run: (ctx) => input(ctx) },
      head: {
        desc: 'first lines of input',
        usage: 'head [-n N] [file]',
        run: (ctx) => {
          const i = ctx.args.indexOf('-n');
          const n = i >= 0 ? Number(ctx.args[i + 1]) || 10 : 10;
          const rest = ctx.args.filter((_, j) => j !== i && j !== i + 1);
          return input({ ...ctx, args: rest })
            .split('\n')
            .slice(0, n)
            .join('\n');
        },
      },
      tail: {
        desc: 'last lines of input',
        usage: 'tail [-n N] [file]',
        run: (ctx) => {
          const i = ctx.args.indexOf('-n');
          const n = i >= 0 ? Number(ctx.args[i + 1]) || 10 : 10;
          const rest = ctx.args.filter((_, j) => j !== i && j !== i + 1);
          return input({ ...ctx, args: rest })
            .split('\n')
            .slice(-n)
            .join('\n');
        },
      },
      grep: {
        desc: 'filter lines matching a pattern',
        usage: 'grep [-i] <pattern> [file…]',
        run: (ctx) => {
          const flags = ctx.args.filter((a) => a.startsWith('-')).join('');
          const [pattern, ...files] = ctx.args.filter((a) => !a.startsWith('-'));
          if (!pattern) throw new CmdError('usage: grep [-i] <pattern> [file…]');
          let re: RegExp;
          try {
            re = new RegExp(pattern, flags.includes('i') ? 'gi' : 'g');
          } catch {
            throw new CmdError(`invalid pattern: ${pattern}`);
          }
          const text = files.length ? files.map(readFile).join('\n') : ctx.stdin;
          return text
            .split('\n')
            .filter((l) => {
              re.lastIndex = 0;
              return re.test(stripAnsi(l));
            })
            .map((l) => (ctx.piped ? l : stripAnsi(l).replace(re, (m) => c.bold(c.red(m)))))
            .join('\n');
        },
      },
      wc: {
        desc: 'count lines, words, chars',
        usage: 'wc [-l] [file]',
        run: (ctx) => {
          const text = stripAnsi(input({ ...ctx, args: ctx.args.filter((a) => !a.startsWith('-')) }));
          const lines = text ? text.split('\n').length : 0;
          if (ctx.args.includes('-l')) return String(lines);
          return `${String(lines).padStart(7)} ${String(text.split(/\s+/).filter(Boolean).length).padStart(7)} ${String(text.length).padStart(7)}`;
        },
      },
      echo: { desc: 'print arguments', usage: 'echo [text…]', run: ({ args }) => args.join(' ') },
      tree: {
        desc: 'directory tree',
        usage: 'tree [path]',
        run: ({ args }) => {
          const { node, abs } = sh.resolve(args[0] ?? '.');
          if (!node || node.type !== 'dir') throw new CmdError(`${args[0] ?? '.'}: not a directory`);
          const lines = [c.bold(c.blue(tildify(abs, sh.home)))];
          let dirs = 0;
          let files = 0;
          const walk = (d: VDir, prefix: string, depth: number) => {
            const entries = Object.entries(d.children).filter(([n]) => !n.startsWith('.'));
            entries.forEach(([n, v], i) => {
              const lastE = i === entries.length - 1;
              lines.push(`${c.muted(prefix + (lastE ? '└── ' : '├── '))}${v.type === 'dir' ? c.bold(c.blue(n)) : n}`);
              if (v.type === 'dir') {
                dirs++;
                if (depth < 3) walk(v, prefix + (lastE ? '    ' : '│   '), depth + 1);
              } else files++;
            });
          };
          walk(node, '', 0);
          lines.push('', `${dirs} directories, ${files} files`);
          return lines.join('\n');
        },
      },
      find: {
        desc: 'search for files by name',
        usage: 'find [path] [-name pattern]',
        run: ({ args }) => {
          const ni = args.indexOf('-name');
          const pattern = ni >= 0 ? (args[ni + 1] ?? '*') : '*';
          const start = args[0] && args[0] !== '-name' ? args[0] : '.';
          const re = new RegExp(
            `^${pattern
              .replace(/[.+^${}()|[\]\\]/g, '\\$&')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.')}$`,
          );
          const { node, abs } = sh.resolve(start);
          if (!node) throw new CmdError(`'${start}': No such file or directory`);
          const out: string[] = [];
          const walk = (n: VNode, p: string) => {
            if (re.test(basename(p))) out.push(tildify(p, sh.home));
            if (n.type === 'dir') for (const [k, v] of Object.entries(n.children)) walk(v, `${p === '/' ? '' : p}/${k}`);
          };
          walk(node, abs);
          return out.join('\n');
        },
      },
      open: {
        desc: 'open a file or app in the GUI',
        usage: 'open <file|app>',
        run: ({ args }) => {
          const target = args[0];
          if (!target)
            throw new CmdError(
              `usage: open <file|app>. Apps: ${Object.values(apps)
                .filter((a) => a.launchable)
                .map((a) => a.id)
                .join(', ')}`,
            );
          if (isAppId(target) && apps[target].launchable) return openApp(target);
          const { node } = sh.resolve(target);
          if (!node) throw new CmdError(`${target}: No such file or app`);
          if (node.type === 'dir') {
            const name = basename(normalize(target, sh.cwd, sh.home));
            if (isAppId(name)) return openApp(name);
            if (name === 'projects' || name === 'blog' || name === 'lab') return openApp(name as AppId);
            throw new CmdError(`${target}: is a directory`);
          }
          if (!node.open) throw new CmdError(`${target}: no application knows how to open this (try cat)`);
          return openApp(node.open.app, { key: node.open.key, props: node.open.props, title: node.open.title });
        },
      },
      neofetch: {
        desc: 'system info, but it is about me',
        run: () => {
          const rows = neofetchRows({ themeName: themes[sh.host.themeId()].name, resolution: sh.host.resolution(), terminal: 'xterm.js' });
          const title = `${c.accent(site.user)}@${c.accent(site.hostname)}`;
          const right = [
            title,
            c.muted('─'.repeat(site.user.length + site.hostname.length + 1)),
            ...rows.map(([k, v]) => `${c.bold(c.accent(k))}: ${v}`),
            '',
            ['40', '41', '42', '43', '44', '45', '46', '47'].map((b) => `\x1b[${b}m   \x1b[0m`).join(''),
          ];
          const n = Math.max(LOGO.length, right.length);
          const out: string[] = [];
          for (let i = 0; i < n; i++) {
            const logo = LOGO[i] ?? ' '.repeat(LOGO[0]!.length);
            const color = i < LOGO.length / 2 ? c.accent : c.pink;
            out.push(`${color(logo)}  ${right[i] ?? ''}`);
          }
          return out.join('\n');
        },
      },
      whoami: {
        desc: 'who is this',
        run: () =>
          [
            c.bold(site.name) + c.muted(` (@${site.handle})`),
            c.accent(site.title),
            '',
            site.tagline,
            '',
            ...site.bio,
            '',
            c.green(`● ${site.availability}`),
          ].join('\n'),
      },
      projects: {
        desc: 'list projects (or open one)',
        usage: 'projects [slug]',
        run: ({ args, piped }) => {
          const slug = args[0];
          if (slug) {
            const p = sh.data.projects.find((x) => x.slug === slug);
            if (!p) throw new CmdError(`unknown project: ${slug}`);
            return openApp('project', { key: p.slug, props: { slug: p.slug }, title: p.title });
          }
          const rows = sh.data.projects.map(
            (p) =>
              `${c.accent(p.slug.padEnd(16))} ${c.muted(String(p.year))}  ${p.featured ? c.yellow('★') : ' '} ${p.title} ${c.muted('· ' + p.stack.slice(0, 3).join(', '))}`,
          );
          return piped
            ? rows.join('\n')
            : [...rows, '', c.muted('cat projects/<slug>.md to read · projects <slug> to open in the GUI')].join('\n');
        },
      },
      blog: {
        desc: 'list posts',
        run: () => sh.data.posts.map((p) => `${c.muted(p.date.slice(0, 10))}  ${c.accent(p.slug)}\n            ${p.title}`).join('\n'),
      },
      lab: { desc: 'open the data science lab', run: () => openApp('lab') },
      architecture: { desc: 'open the architecture canvas', run: () => openApp('architecture') },
      skills: {
        desc: 'skill meters',
        run: () =>
          skills
            .map((g) =>
              [
                c.pink(c.bold(g.group)),
                ...g.items.map(
                  (i) =>
                    `  ${i.name.padEnd(22)} ${c.accent('█'.repeat(Math.round(i.level / 5)))}${c.muted('░'.repeat(20 - Math.round(i.level / 5)))} ${c.muted(`${i.level}%`)}`,
                ),
              ].join('\n'),
            )
            .join('\n\n'),
      },
      experience: {
        desc: 'career log (journalctl style)',
        run: () =>
          sh.data.experience
            .map((e) =>
              [
                `${c.muted(`${e.start} → ${e.end ?? 'present'}`)} ${c.accent(e.company)} ${c.bold(e.role)}`,
                ...e.highlights.map((h) => `  ${c.green('●')} ${h}`),
              ].join('\n'),
            )
            .join('\n\n'),
      },
      journalctl: { desc: 'alias of experience', hidden: true, run: (ctx) => cmds.experience!.run(ctx) },
      resume: {
        desc: 'print résumé (use --open for the PDF viewer)',
        usage: 'resume [--open]',
        run: ({ args }) =>
          args.includes('--open')
            ? openApp('resume')
            : readFile(`${HOME}/resume.md`) + '\n\n' + c.muted('resume --open for the PDF · open resume.pdf'),
      },
      contact: { desc: 'open the mail composer', run: () => [readFile(`${HOME}/contact.txt`), '', openApp('contact')].join('\n') },
      gh: {
        desc: 'live GitHub stats',
        usage: 'gh [repos]',
        run: async ({ args }) => {
          const s = await sh.host.github();
          if (args[0] === 'repos')
            return (
              s.repos
                .filter((r) => !r.fork)
                .slice(0, 15)
                .map(
                  (r) =>
                    `${c.accent(r.name.padEnd(28))} ${c.yellow(`★${r.stars}`.padEnd(6))} ${c.muted((r.language ?? '-').padEnd(12))} ${c.muted(timeAgo(r.pushedAt))}`,
                )
                .join('\n') || c.muted('no public repos yet')
            );
          const spark = '▁▂▃▄▅▆▇█';
          const max = Math.max(1, ...s.activity);
          return [
            `${c.bold(s.user.name ?? s.user.login)} ${c.muted(`@${s.user.login}`)}`,
            `${c.accent(s.user.publicRepos)} repos · ${c.accent(s.user.followers)} followers · joined ${new Date(s.user.createdAt).getFullYear()}`,
            '',
            `activity (30d) ${c.green(s.activity.map((v) => spark[Math.min(7, Math.round((v / max) * 7))]).join(''))}`,
            '',
            ...s.languages.map(
              (l) =>
                `${l.name.padEnd(14)} ${c.accent('█'.repeat(Math.max(1, Math.round(l.share * 30))))} ${c.muted(`${(l.share * 100).toFixed(1)}%`)}`,
            ),
            '',
            c.muted('gh repos · open github'),
          ].join('\n');
        },
      },
      gui: {
        desc: 'return to the desktop',
        run: (ctx) => {
          ctx.effect({ type: 'gui' });
          return '';
        },
      },
      exit: { desc: 'leave the shell', run: (ctx) => cmds.gui!.run(ctx) },
      theme: {
        desc: 'switch the rice',
        usage: 'theme [list|next|<name>]',
        run: ({ args }) => {
          const arg = args[0] ?? 'list';
          if (arg === 'list')
            return (
              themeIds
                .map((id) => `${id === sh.host.themeId() ? c.green('●') : c.muted('○')} ${c.accent(id.padEnd(18))} ${themes[id].name}`)
                .join('\n') +
              '\n' +
              c.muted('theme <name> to apply')
            );
          const next = arg === 'next' ? themeIds[(themeIds.indexOf(sh.host.themeId()) + 1) % themeIds.length]! : arg;
          if (!isThemeId(next)) throw new CmdError(`unknown theme '${arg}'. Try: theme list`);
          sh.host.setTheme(next);
          return c.green(`✓ ${themes[next].name}`);
        },
      },
      top: { desc: 'resource monitor (skills)', run: () => (sh.host.embedded() ? openApp('skills') : cmds.skills!.run({} as Ctx)) },
      lock: { desc: 'lock the screen', run: () => (sh.host.lock(), '') },
      reboot: { desc: 'replay the boot sequence', run: () => (sh.host.reboot(), 'Rebooting…') },
      shutdown: { desc: 'power off', hidden: true, run: () => c.yellow("shutdown: I'd rather not. You'd have to reopen the tab.") },
      poweroff: { desc: 'power off', hidden: true, run: (ctx) => cmds.shutdown!.run(ctx) },
      clear: {
        desc: 'clear the screen',
        run: (ctx) => {
          ctx.effect({ type: 'clear' });
          return '';
        },
      },
      history: { desc: 'command history', run: () => sh.history.map((h, i) => `${c.muted(String(i + 1).padStart(4))}  ${h}`).join('\n') },
      uname: {
        desc: 'system information',
        usage: 'uname [-a]',
        run: ({ args }) =>
          args.includes('-a') ? `Linux ${site.hostname} 6.18.4-ba1.fc42.x86_64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` : 'Linux',
      },
      hostname: { desc: 'print host name', run: () => site.hostname },
      date: { desc: 'print the date', run: () => new Date().toString() },
      uptime: {
        desc: 'career uptime',
        run: () => {
          const t = new Date();
          return ` ${t.toTimeString().slice(0, 8)} up ${new Date().getFullYear() - site.careerStart} years, 1 user, load average: 0.42, 0.37, 0.30`;
        },
      },
      env: {
        desc: 'environment variables',
        run: () =>
          Object.entries(sh.env)
            .map(([k, v]) => `${c.accent(k)}=${v}`)
            .join('\n'),
      },
      export: {
        desc: 'set an environment variable',
        usage: 'export NAME=value',
        run: ({ args }) => {
          for (const a of args) {
            const [k, ...v] = a.split('=');
            if (k) sh.env[k] = v.join('=');
          }
          return '';
        },
      },
      which: {
        desc: 'locate a command',
        usage: 'which <cmd>',
        run: ({ args }) =>
          args
            .map((a) =>
              sh.aliases[a] ? `${a}: aliased to ${sh.aliases[a]}` : cmds[a] && !cmds[a].hidden ? `/usr/bin/${a}` : c.red(`${a} not found`),
            )
            .join('\n'),
      },
      whereis: { desc: 'locate', hidden: true, run: (ctx) => cmds.which!.run(ctx) },
      id: {
        desc: 'user identity',
        run: () => `uid=1000(${site.user}) gid=1000(${site.user}) groups=1000(${site.user}),10(wheel),963(docker),977(architects)`,
      },
      python: {
        desc: 'CPython REPL (WebAssembly via Pyodide)',
        usage: 'python',
        run: (ctx) => {
          ctx.effect({ type: 'python' });
          return '';
        },
      },
      ujust: {
        desc: 'Bazzite task runner',
        usage: 'ujust [recipe]',
        run: ({ args }) => {
          const r = args[0];
          if (!r || r === '--choose' || r === '--list')
            return [
              'Available recipes:',
              ...['hire-luna', 'update', 'setup-distrobox-app', 'enable-hyprland', 'rice'].map((x) => `    ${c.accent(x)}`),
            ].join('\n');
          if (r === 'hire-luna') return [c.green('✓ excellent choice.'), openApp('contact')].join('\n');
          if (r === 'update')
            return [
              'rpm-ostree: staging deployment…',
              'flatpak: 0 updates',
              'distrobox: up to date',
              c.green('✓ system up to date (it is a static site, it is always up to date)'),
            ].join('\n');
          if (r === 'rice') return cmds.theme!.run({ args: ['next'] } as Ctx);
          return c.muted(`running ${r}… done. (recipes here are mostly decorative)`);
        },
      },
      'rpm-ostree': {
        desc: 'image-based package manager',
        usage: 'rpm-ostree status',
        run: ({ args }) =>
          args[0] === 'status' || !args.length
            ? [
                `State: idle`,
                'Deployments:',
                `${c.green('●')} ostree-image-signed:docker://ghcr.io/${site.github}/portfolio:latest`,
                `                   Version: 42.${new Date().toISOString().slice(0, 10).replace(/-/g, '')} (${site.handle})`,
                `    LayeredPackages: curiosity caffeine`,
              ].join('\n')
            : args[0] === 'rollback'
              ? c.yellow('Moving to previous deployment… just kidding, this build is the good one.')
              : c.muted(`rpm-ostree ${args.join(' ')}: nothing to do.`),
      },
      hyprctl: {
        desc: 'query the compositor',
        usage: 'hyprctl [clients|version]',
        run: ({ args }) =>
          args[0] === 'version'
            ? 'Hyprland (web port) built from branch main at commit luna · flags: +gaps +blur +webgl'
            : `Monitor web-0: ${sh.host.resolution()} @ 60Hz\n  layout: dwindle · gaps_in: 5 · gaps_out: 12 · rounding: 12\n${c.muted('(open the desktop with `gui` to see the clients)')}`,
      },
      flatpak: {
        desc: 'flatpak',
        hidden: true,
        run: ({ args }) =>
          args[0] === 'list'
            ? 'Name       Application ID\nSteam      com.valvesoftware.Steam\nObsidian   md.obsidian.Obsidian\nVS Code    com.visualstudio.code'
            : 'Looking for updates… Nothing to do.',
      },
      dnf: {
        desc: 'package manager',
        hidden: true,
        run: () => c.yellow('dnf: this is an atomic system, friend. Try rpm-ostree, distrobox, or flatpak.'),
      },
      apt: { desc: 'wrong distro', hidden: true, run: () => c.yellow("apt: this is Fedora-land. We don't do that here.") },
      pacman: { desc: 'wrong distro', hidden: true, run: () => c.yellow('pacman: I use Bazzite, btw.') },
      fortune: { desc: 'a fortune', run: () => FORTUNES[Math.floor(Math.random() * FORTUNES.length)]! },
      cowsay: {
        desc: 'a talking cow',
        usage: 'cowsay [text]',
        run: ({ args, stdin }) => cowsay(stripAnsi(args.join(' ') || stdin || 'moo. hire luna.')),
      },
      sl: {
        desc: 'you meant ls',
        run: (ctx) => {
          ctx.effect({ type: 'sl' });
          return '';
        },
      },
      cmatrix: {
        desc: 'wake up, Neo',
        run: (ctx) => {
          ctx.effect({ type: 'cmatrix' });
          return '';
        },
      },
      vim: {
        desc: 'the editor you cannot leave',
        usage: 'vim [file]',
        run: (ctx) => {
          ctx.effect({ type: 'vim', file: ctx.args[0] });
          return '';
        },
      },
      nano: {
        desc: 'editor',
        hidden: true,
        run: () => c.muted('nano: all files here are read-only. Your opinions about vim are noted, though.'),
      },
      emacs: {
        desc: 'editor',
        hidden: true,
        run: () => c.muted('emacs: a great operating system, lacking only a decent editor. (kidding!)'),
      },
      sudo: {
        desc: 'with great power…',
        usage: 'sudo <cmd>',
        run: async (ctx) => {
          const joined = ctx.args.join(' ');
          if (/^rm\s+-(rf|fr)\s+\/(\s|$|\*)/.test(joined)) return cmds.rm!.run({ ...ctx, args: ctx.args.slice(1) });
          if (ctx.args[0] === 'make' && ctx.args[1] === 'me') return c.green('Okay. 🥪');
          return [
            c.yellow('We trust you have received the usual lecture from the local System Administrator.'),
            c.yellow('It usually boils down to these three things:'),
            '    #1) Respect the privacy of others.',
            '    #2) Think before you type.',
            '    #3) With great power comes great responsibility.',
            '',
            c.red(`${site.user} is not in the sudoers file. This incident will be reported.`),
          ].join('\n');
        },
      },
      rm: {
        desc: 'remove files',
        usage: 'rm <file>',
        run: (ctx) => {
          const joined = ctx.args.join(' ');
          if (/-(rf|fr)/.test(joined) && /(^|\s)(\/|\/\*|~|\*)(\s|$)/.test(joined)) {
            ctx.effect({ type: 'panic' });
            return '';
          }
          throw new CmdError('read-only file system (this portfolio is immutable, like Bazzite)');
        },
      },
      mkdir: {
        desc: 'make directories',
        hidden: true,
        run: () => {
          throw new CmdError('read-only file system');
        },
      },
      touch: {
        desc: 'touch',
        hidden: true,
        run: () => {
          throw new CmdError('read-only file system');
        },
      },
      make: {
        desc: 'build things',
        run: ({ args }) =>
          args.join(' ') === 'me a sandwich'
            ? c.red('What? Make it yourself.')
            : args.length
              ? c.muted(`make: *** No rule to make target '${args[0]}'.  Stop.`)
              : c.muted('make: *** No targets specified and no makefile found.  Stop.'),
      },
      coffee: {
        desc: 'brew',
        run: () =>
          [
            '      ( (',
            '       ) )',
            '    ........',
            '    |      |]',
            '    \\      /',
            "     `----'",
            c.muted("418 I'm a teapot. Close enough."),
          ].join('\n'),
      },
      ping: {
        desc: 'ping',
        hidden: true,
        run: ({ args }) =>
          `PING ${args[0] ?? 'localhost'}: 64 bytes, icmp_seq=1 ttl=64 time=0.42 ms\n${c.muted('(simulated. The only thing I ping for real is the GitHub API.)')}`,
      },
      curl: {
        desc: 'curl',
        hidden: true,
        run: ({ args }) =>
          args.join(' ').includes('wttr.in')
            ? 'Weather: ☀  clear skies, 0% chance of downtime'
            : c.muted('curl: sandboxed. Try `gh` for live data.'),
      },
      git: {
        desc: 'git',
        hidden: true,
        run: ({ args }) =>
          args[0] === 'blame'
            ? c.muted('it was me. it is always me.')
            : args[0] === 'log'
              ? `${c.yellow('commit 1a2b3c4')} ${c.muted('(HEAD -> main)')}\n    feat: become a systems architect`
              : c.muted('On branch main\nnothing to commit, working tree clean'),
      },
    };
    return cmds;
  }
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length]![b.length]!;
}

function commonPrefix(list: string[]): string {
  if (!list.length) return '';
  let p = list[0]!;
  for (const s of list) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
}
