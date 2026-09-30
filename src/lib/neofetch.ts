import { site, skills } from '../config/site';

/** Bazzite-ish logo: a stylised "B" in a rounded tile. */
export const LOGO = [
  '      ▄▄██████████▄▄      ',
  '    ▟███▀▀▀▀▀▀▀▀▀▀███▙    ',
  '   ███▘  ▗▄▄▄▄▄▄▖   ▝███   ',
  '  ▐██▌   ▐██████▙    ▐██▌  ',
  '  ▐██▌   ▐██▌ ▝██▌   ▐██▌  ',
  '  ▐██▌   ▐██████▛    ▐██▌  ',
  '  ▐██▌   ▐██▌ ▝██▙   ▐██▌  ',
  '  ▐██▌   ▐██▌  ▐██▌  ▐██▌  ',
  '  ▐██▌   ▐███████▛   ▐██▌  ',
  '   ███▖  ▝▀▀▀▀▀▀▘   ▗███   ',
  '    ▜███▄▄▄▄▄▄▄▄▄▄███▛    ',
  '      ▀▀██████████▀▀      ',
];

export function uptime(from = site.careerStart, now = new Date()): string {
  const months = (now.getFullYear() - from) * 12 + now.getMonth();
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} years${m ? `, ${m} mins` : ''}`.replace('mins', m === 1 ? 'month' : 'months');
}

export interface FetchEnv {
  themeName: string;
  resolution?: string;
  terminal?: string;
  now?: Date;
}

export function neofetchRows(env: FetchEnv): [string, string][] {
  const pkgCount = skills.reduce((n, g) => n + g.items.length, 0);
  return [
    ['OS', 'Bazzite 42 (Fedora Atomic) x86_64'],
    ['Host', `${site.handle}.github.io`],
    ['Kernel', '6.18.4-ba1.fc42.x86_64'],
    ['Uptime', uptime(site.careerStart, env.now)],
    ['Packages', `${pkgCount} (skills), ${skills.length} (groups)`],
    ['Shell', 'lsh 1.0 (luna shell)'],
    ['Resolution', env.resolution ?? '1920x1080'],
    ['WM', 'Hyprland (web port)'],
    ['Theme', env.themeName],
    ['Terminal', env.terminal ?? 'kitty'],
    ['Role', site.title],
    ['Location', site.location],
    ['CPU', 'Human Brain v2 @ 3 coffees/day'],
    ['Memory', 'Long-term: ok · Short-term: cached'],
  ];
}
