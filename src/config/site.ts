/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SINGLE EDIT POINT FOR IDENTITY.
 *  Everything personal that isn't long-form content lives here. Projects, blog
 *  posts, lab notebooks and experience live in `src/content/`.
 *  Values marked TODO are placeholders — swap them for the real thing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const site = {
  handle: 'lunaevolans',
  /** TODO: your real name (shown on the resume and in metadata). */
  name: 'Luna Evolans',
  /** Short login-name used in the shell prompt: `luna@bazzite`. */
  user: 'luna',
  hostname: 'bazzite',
  title: 'Systems Architect · Full-Stack & Data',
  tagline: 'I design systems end-to-end: from the kernel to the dashboard and the model behind it.',
  /** TODO: 2–3 sentence bio. */
  bio: [
    'Linux-native software engineer who likes owning the whole stack: typed front-ends, boring-reliable APIs, event pipelines, and the data science that turns their exhaust into decisions.',
    'Daily-driving Bazzite on a tiling setup. I care about latency budgets, observability, and code that the next person can read at 3am.',
  ],
  location: 'Remote · UTC-5', // TODO
  /** Year you started programming professionally — drives neofetch "uptime". */
  careerStart: 2017, // TODO
  availability: 'Open to staff / architect roles and select contracts', // TODO
  email: 'hello@lunaevolans.dev', // TODO
  github: 'lunaevolans',
  links: [
    { label: 'GitHub', href: 'https://github.com/lunaevolans', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/lunaevolans', icon: 'linkedin' }, // TODO
    { label: 'Email', href: 'mailto:hello@lunaevolans.dev', icon: 'mail' }, // TODO
  ],
  /**
   * Contact form backend. Create a free access key at https://web3forms.com
   * and paste it here. While it is the placeholder, the form falls back to
   * opening the visitor's mail client with the message pre-filled.
   */
  web3formsKey: 'YOUR_WEB3FORMS_ACCESS_KEY', // TODO
} as const;

export type SkillGroup = { group: string; items: { name: string; level: number }[] };

/** Levels are 0–100 and drive the btop-style meters. TODO: tune. */
export const skills: SkillGroup[] = [
  {
    group: 'Systems & Infra',
    items: [
      { name: 'Linux / systemd', level: 95 },
      { name: 'Kubernetes', level: 85 },
      { name: 'Terraform / Nix', level: 80 },
      { name: 'Observability (OTel)', level: 85 },
    ],
  },
  {
    group: 'Backend',
    items: [
      { name: 'Go', level: 88 },
      { name: 'Rust', level: 72 },
      { name: 'Python', level: 92 },
      { name: 'PostgreSQL', level: 90 },
      { name: 'Kafka / NATS', level: 80 },
    ],
  },
  {
    group: 'Frontend',
    items: [
      { name: 'TypeScript', level: 92 },
      { name: 'React / Preact', level: 86 },
      { name: 'Astro / SvelteKit', level: 78 },
      { name: 'WebGL / Canvas', level: 65 },
    ],
  },
  {
    group: 'Data & ML',
    items: [
      { name: 'pandas / Polars', level: 90 },
      { name: 'scikit-learn', level: 85 },
      { name: 'PyTorch', level: 70 },
      { name: 'dbt / DuckDB', level: 82 },
      { name: 'Forecasting', level: 80 },
    ],
  },
];
