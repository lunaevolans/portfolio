/** Registry of desktop "applications". */

export type AppId =
  | 'about'
  | 'skills'
  | 'experience'
  | 'terminal'
  | 'projects'
  | 'project'
  | 'github'
  | 'architecture'
  | 'lab'
  | 'blog'
  | 'post'
  | 'contact'
  | 'resume';

export interface AppMeta {
  id: AppId;
  title: string;
  /** Pseudo-path shown in the title bar. */
  path: string;
  icon: IconName;
  /** Home workspace (1-based). Detail apps open on the current workspace. */
  workspace: number;
  /** Only one instance allowed. */
  singleton: boolean;
  /** Listed in the launcher / mobile home screen. */
  launchable: boolean;
  description: string;
}

export type IconName =
  | 'user'
  | 'cpu'
  | 'journal'
  | 'terminal'
  | 'folder'
  | 'file'
  | 'github'
  | 'graph'
  | 'flask'
  | 'book'
  | 'mail'
  | 'pdf'
  | 'palette'
  | 'power'
  | 'lock'
  | 'keyboard'
  | 'search'
  | 'linkedin'
  | 'external'
  | 'close'
  | 'float'
  | 'max'
  | 'back'
  | 'sparkle';

export const apps: Record<AppId, AppMeta> = {
  about: {
    id: 'about',
    title: 'neofetch',
    path: '~/about',
    icon: 'user',
    workspace: 1,
    singleton: true,
    launchable: true,
    description: 'Who I am, rendered as system info',
  },
  skills: {
    id: 'skills',
    title: 'btop',
    path: '~/skills',
    icon: 'cpu',
    workspace: 1,
    singleton: true,
    launchable: true,
    description: 'Skill meters, btop style',
  },
  experience: {
    id: 'experience',
    title: 'journalctl',
    path: '~/experience',
    icon: 'journal',
    workspace: 1,
    singleton: true,
    launchable: true,
    description: 'Career log',
  },
  terminal: {
    id: 'terminal',
    title: 'kitty',
    path: '~',
    icon: 'terminal',
    workspace: 0,
    singleton: false,
    launchable: true,
    description: 'A real(ish) shell',
  },
  projects: {
    id: 'projects',
    title: 'Projects',
    path: '~/projects',
    icon: 'folder',
    workspace: 2,
    singleton: true,
    launchable: true,
    description: 'Selected work',
  },
  project: {
    id: 'project',
    title: 'Project',
    path: '~/projects',
    icon: 'file',
    workspace: 0,
    singleton: false,
    launchable: false,
    description: 'Project details',
  },
  github: {
    id: 'github',
    title: 'gh dash',
    path: '~/github',
    icon: 'github',
    workspace: 2,
    singleton: true,
    launchable: true,
    description: 'Live GitHub activity',
  },
  architecture: {
    id: 'architecture',
    title: 'Architecture',
    path: '~/architecture',
    icon: 'graph',
    workspace: 3,
    singleton: true,
    launchable: true,
    description: 'Interactive system design',
  },
  lab: {
    id: 'lab',
    title: 'Lab',
    path: '~/lab',
    icon: 'flask',
    workspace: 4,
    singleton: true,
    launchable: true,
    description: 'Data science notebooks + live Python',
  },
  blog: {
    id: 'blog',
    title: 'Devlog',
    path: '~/blog',
    icon: 'book',
    workspace: 5,
    singleton: true,
    launchable: true,
    description: 'Writing',
  },
  post: {
    id: 'post',
    title: 'Post',
    path: '~/blog',
    icon: 'file',
    workspace: 0,
    singleton: false,
    launchable: false,
    description: 'Blog post',
  },
  contact: {
    id: 'contact',
    title: 'neomutt',
    path: '~/contact',
    icon: 'mail',
    workspace: 6,
    singleton: true,
    launchable: true,
    description: 'Send me a message',
  },
  resume: {
    id: 'resume',
    title: 'zathura',
    path: '~/resume.pdf',
    icon: 'pdf',
    workspace: 6,
    singleton: true,
    launchable: true,
    description: 'Résumé / CV',
  },
};

export const WORKSPACES = [
  { n: 1, name: 'home', apps: ['about', 'skills', 'experience'] as AppId[] },
  { n: 2, name: 'work', apps: ['projects', 'github'] as AppId[] },
  { n: 3, name: 'arch', apps: ['architecture'] as AppId[] },
  { n: 4, name: 'lab', apps: ['lab'] as AppId[] },
  { n: 5, name: 'blog', apps: ['blog'] as AppId[] },
  { n: 6, name: 'mail', apps: ['contact', 'resume'] as AppId[] },
];

export function isAppId(v: unknown): v is AppId {
  return typeof v === 'string' && v in apps;
}
