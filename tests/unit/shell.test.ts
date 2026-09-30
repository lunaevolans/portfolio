import { describe, expect, it } from 'vitest';
import { Shell, stripAnsi } from '../../src/lib/shell/shell';
import { data, makeHost } from './fixtures';

const run = async (sh: Shell, line: string) => {
  const r = await sh.exec(line);
  return { ...r, text: stripAnsi(r.out) };
};

describe('shell', () => {
  it('lists the home directory', async () => {
    const sh = new Shell(data, makeHost().host);
    const { text } = await run(sh, 'ls');
    expect(text).toContain('projects/');
    expect(text).toContain('README.md');
    expect(text).not.toContain('.secrets');
    expect((await run(sh, 'ls -a')).text).toContain('.secrets');
  });

  it('navigates with cd and pwd', async () => {
    const sh = new Shell(data, makeHost().host);
    await run(sh, 'cd projects');
    expect((await run(sh, 'pwd')).text).toBe('/home/luna/projects');
    await run(sh, 'cd ..');
    expect(sh.cwd).toBe('/home/luna');
    expect((await run(sh, 'cd nope')).code).toBe(1);
  });

  it('cats files and supports pipes', async () => {
    const sh = new Shell(data, makeHost().host);
    expect((await run(sh, 'cat projects/helios.md')).text).toContain('Too many cron jobs');
    expect((await run(sh, 'cat projects/helios.md | grep -i outcome')).text).toBe('## Outcome');
    expect((await run(sh, 'cat projects/helios.md | head -n 1')).text).toBe('# Helios Event Platform');
    expect((await run(sh, 'echo a b c | wc -l')).text).toBe('1');
  });

  it('respects && and ||', async () => {
    const sh = new Shell(data, makeHost().host);
    expect((await run(sh, 'cd nope && echo yes')).text).not.toContain('yes');
    expect((await run(sh, 'cd nope || echo fallback')).text).toContain('fallback');
  });

  it('reports unknown commands with suggestions', async () => {
    const sh = new Shell(data, makeHost().host);
    const r = await run(sh, 'nefetch');
    expect(r.code).toBe(127);
    expect(r.text).toContain('neofetch');
  });

  it('opens files in the GUI', async () => {
    const { host, calls } = makeHost();
    const sh = new Shell(data, host);
    await run(sh, 'open projects/helios.md');
    expect(calls.open[0]![0]).toBe('project');
    await run(sh, 'open lab');
    expect(calls.open[1]![0]).toBe('lab');
  });

  it('switches themes', async () => {
    const { host, calls } = makeHost();
    const sh = new Shell(data, host);
    await run(sh, 'theme nord');
    expect(calls.theme).toEqual(['nord']);
    expect((await run(sh, 'theme nope')).code).toBe(1);
  });

  it('returns effects for interactive programs', async () => {
    const sh = new Shell(data, makeHost().host);
    expect((await sh.exec('clear')).effect).toEqual({ type: 'clear' });
    expect((await sh.exec('gui')).effect).toEqual({ type: 'gui' });
    expect((await sh.exec('sudo rm -rf /')).effect).toEqual({ type: 'panic' });
    expect((await sh.exec('rm -rf ~')).effect).toEqual({ type: 'panic' });
    expect((await sh.exec('rm file')).effect).toBeUndefined();
  });

  it('expands variables and aliases', async () => {
    const sh = new Shell(data, makeHost().host);
    expect((await run(sh, 'echo $USER')).text).toBe('luna');
    expect((await run(sh, 'll')).text).toContain('drwxr-xr-x');
  });

  it('tab-completes commands and paths', () => {
    const sh = new Shell(data, makeHost().host);
    expect(sh.complete('neof').line).toBe('neofetch ');
    expect(sh.complete('cat proj').line).toBe('cat projects/');
    expect(sh.complete('cat projects/he').line).toBe('cat projects/helios.md ');
    expect(sh.complete('theme no').line).toBe('theme nord ');
    expect(sh.complete('c').options.length).toBeGreaterThan(1);
  });

  it('surfaces async failures', async () => {
    const sh = new Shell(data, makeHost().host);
    const r = await run(sh, 'gh');
    expect(r.code).toBe(1);
    expect(r.text).toContain('offline');
  });

  it('neofetch prints the logo and rows', async () => {
    const sh = new Shell(data, makeHost().host);
    const { text } = await run(sh, 'neofetch');
    expect(text).toContain('luna@bazzite');
    expect(text).toContain('Hyprland');
  });
});
