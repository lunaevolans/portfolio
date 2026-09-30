import type { PortfolioData } from '../../src/lib/types';
import type { ShellHost } from '../../src/lib/shell/shell';
import type { ThemeId } from '../../src/lib/themes';

export const data: PortfolioData = {
  base: '/',
  buildTime: '2026-09-30T00:00:00.000Z',
  projects: [
    {
      slug: 'helios',
      title: 'Helios Event Platform',
      summary: 'Event backbone',
      role: 'Lead',
      year: 2025,
      status: 'production',
      category: 'platform',
      stack: ['Go', 'Kafka'],
      metrics: [{ label: 'events / day', value: '2B' }],
      links: {},
      featured: true,
      html: '<p>hi</p>',
      body: '## Problem\nToo many cron jobs.\n## Outcome\nFewer pages.',
    },
  ],
  posts: [
    {
      slug: 'boring-event-driven',
      title: 'Make event-driven systems boring',
      description: 'outbox',
      date: '2026-05-02T00:00:00.000Z',
      tags: ['architecture'],
      html: '',
      body: 'Use the outbox pattern.',
      minutes: 1,
    },
  ],
  lab: [],
  experience: [
    { id: 'x', company: 'Orbital', role: 'Staff', start: '2023-03', end: null, location: 'Remote', highlights: ['Did things'], stack: [] },
  ],
};

export function makeHost() {
  const calls: { open: unknown[][]; theme: ThemeId[] } = { open: [], theme: [] };
  let theme: ThemeId = 'bazzite';
  const host: ShellHost = {
    open: (...a) => void calls.open.push(a),
    setTheme: (id) => {
      theme = id;
      calls.theme.push(id);
    },
    themeId: () => theme,
    reboot: () => {},
    lock: () => {},
    github: async () => {
      throw new Error('offline');
    },
    resolution: () => '1920x1080',
    embedded: () => true,
  };
  return { host, calls };
}
