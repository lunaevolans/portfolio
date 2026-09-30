import { site, skills } from '../../config/site';
import type { PortfolioData } from '../types';
import { dir, file, type VDir } from './vfs';

export const HOME = `/home/${site.user}`;

export function resumeText(data: PortfolioData): string {
  const lines: string[] = [
    `${site.name.toUpperCase()}`,
    `${site.title}`,
    `${site.location} · ${site.email} · github.com/${site.github}`,
    '',
    'SUMMARY',
    ...site.bio.map((b) => `  ${b}`),
    '',
    'EXPERIENCE',
  ];
  for (const e of data.experience) {
    lines.push(`  ${e.role}`, `  ${e.company} · ${e.start} → ${e.end ?? 'present'} · ${e.location}`);
    for (const h of e.highlights) lines.push(`    • ${h}`);
    lines.push('');
  }
  lines.push('SKILLS');
  for (const g of skills) lines.push(`  ${g.group.padEnd(16)} ${g.items.map((i) => i.name).join(', ')}`);
  lines.push('', 'SELECTED PROJECTS');
  for (const p of data.projects.filter((x) => x.featured)) lines.push(`  ${p.title}: ${p.summary}`);
  return lines.join('\n');
}

function projectFile(p: PortfolioData['projects'][number]) {
  const header = [
    `# ${p.title}`,
    '',
    `role:    ${p.role}`,
    `year:    ${p.year}`,
    `status:  ${p.status}`,
    `stack:   ${p.stack.join(', ')}`,
    ...p.metrics.map((m) => `metric:  ${m.value} ${m.label}`),
    '',
    p.summary,
    '',
  ];
  return header.join('\n') + p.body.trim();
}

const HYPRLAND_CONF = `# ~/.config/hypr/hyprland.conf (abridged)
monitor = , preferred, auto, 1

general {
    gaps_in = 5
    gaps_out = 12
    border_size = 2
    col.active_border = rgba(a67cffee) rgba(ff5fd2ee) rgba(43e0ffee) 45deg
    layout = dwindle
}

decoration {
    rounding = 12
    blur { enabled = true; size = 8; passes = 3 }
}

animations {
    bezier = snappy, 0.2, 0.9, 0.1, 1.05
    animation = windows, 1, 5, snappy, popin 85%
    animation = workspaces, 1, 6, snappy, slide
}

$mod = SUPER
bind = $mod, RETURN, exec, kitty
bind = $mod, Q, killactive
bind = $mod, V, togglefloating
bind = $mod, F, fullscreen
bind = $mod, D, exec, rofi -show drun
bind = $mod, T, exec, toggle-tty
bind = $mod, L, exec, hyprlock
bind = $mod, 1, workspace, 1   # … through 6
`;

/** Build the virtual filesystem from portfolio content. */
export function buildFs(data: PortfolioData, commands: string[]): VDir {
  const projects = dir(
    Object.fromEntries(
      data.projects.map((p) => [
        `${p.slug}.md`,
        file(projectFile(p), { open: { app: 'project', key: p.slug, props: { slug: p.slug }, title: p.title } }),
      ]),
    ),
  );
  const blog = dir(
    Object.fromEntries(
      data.posts.map((p) => [
        `${p.slug}.md`,
        file(`# ${p.title}\n${p.date.slice(0, 10)} · ${p.tags.join(', ')}\n\n${p.body.trim()}`, {
          open: { app: 'post', key: p.slug, props: { slug: p.slug }, title: p.title },
        }),
      ]),
    ),
  );
  const lab = dir(
    Object.fromEntries(
      data.lab.map((l) => [
        `${l.slug}.ipynb`,
        file(
          [
            `# ${l.title}`,
            `question: ${l.question}`,
            `method:   ${l.method}`,
            ...l.metrics.map((m) => `metric:   ${m.label} = ${m.value}`),
            '',
            '(open it to see the charts: `open lab`)',
          ].join('\n'),
          { open: { app: 'lab' } },
        ),
      ]),
    ),
  );

  const readme = [
    `Welcome to ${site.user}@${site.hostname}.`,
    '',
    'This is a portfolio disguised as a Linux desktop. Things to try:',
    '  ls                      look around',
    '  cat about.txt           the short version',
    '  open projects           browse work in the GUI',
    '  cat projects/helios.md  read a case study here',
    '  gh                      live GitHub stats',
    '  theme list              switch the rice',
    '  python                  a real CPython REPL (WebAssembly)',
    '  gui                     back to the desktop',
    '',
    'Type `help` for everything else.',
  ].join('\n');

  const about = [site.name, site.title, '', site.tagline, '', ...site.bio, '', `Status: ${site.availability}`].join('\n');

  const contact = [
    `email    ${site.email}`,
    ...site.links.filter((l) => l.icon !== 'mail').map((l) => `${l.label.toLowerCase().padEnd(8)} ${l.href}`),
    '',
    'Or run `contact` to open the mail composer.',
  ].join('\n');

  return dir({
    home: dir({
      [site.user]: dir({
        'README.md': file(readme),
        'about.txt': file(about, { open: { app: 'about' } }),
        'contact.txt': file(contact, { open: { app: 'contact' } }),
        'resume.md': file(resumeText(data), { open: { app: 'resume' } }),
        'resume.pdf': file('%PDF-1.7 (binary)', { open: { app: 'resume' } }),
        projects,
        blog,
        lab,
        '.config': dir({
          hypr: dir({ 'hyprland.conf': file(HYPRLAND_CONF) }),
          lsh: dir({ lshrc: file('alias ll="ls -la"\nexport EDITOR=nvim\n# you found a dotfile. have a cookie 🍪') }),
        }),
        '.secrets': file('nice try. the only secret here is that I actually enjoy writing YAML.'),
      }),
    }),
    etc: dir({
      'os-release': file(
        'NAME="Bazzite"\nVERSION="42 (FROM Fedora Kinoite)"\nID=bazzite\nID_LIKE="fedora"\nVARIANT_ID=bazzite-portfolio\nHOME_URL="https://bazzite.gg"\nPRETTY_NAME="Bazzite 42 (portfolio edition)"',
      ),
      hostname: file(site.hostname),
      motd: file('Remember: `ujust --choose` fixes most things. For everything else, there is `git revert`.'),
    }),
    usr: dir({ bin: dir(Object.fromEntries(commands.map((c) => [c, file(`ELF 64-bit LSB executable: ${c}`, { exec: true })]))) }),
    proc: dir({
      cpuinfo: file(
        'model name\t: Human Brain v2\ncpu MHz\t\t: 3 coffees/day\ncache size\t: 10+ years of Linux\nflags\t\t: systems data fullstack ml observability',
      ),
    }),
    tmp: dir(),
  });
}
