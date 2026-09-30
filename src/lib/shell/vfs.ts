import type { AppId } from '../apps';

export interface VFile {
  type: 'file';
  content: string;
  /** Opening this file in the GUI launches an app. */
  open?: { app: AppId; key?: string; props?: Record<string, string>; title?: string };
  exec?: boolean;
}
export interface VDir {
  type: 'dir';
  children: Record<string, VNode>;
}
export type VNode = VFile | VDir;

export const dir = (children: Record<string, VNode> = {}): VDir => ({ type: 'dir', children });
export const file = (content: string, extra: Partial<VFile> = {}): VFile => ({ type: 'file', content, ...extra });

/** Resolve `path` against `cwd` (both may use `~`) into a normalised absolute path. */
export function normalize(path: string, cwd: string, home: string): string {
  let p = path;
  if (p === '~' || p.startsWith('~/')) p = home + p.slice(1);
  if (!p.startsWith('/')) p = `${cwd === '/' ? '' : cwd}/${p}`;
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return `/${parts.join('/')}`;
}

export function lookup(root: VDir, abs: string): VNode | null {
  let node: VNode = root;
  for (const seg of abs.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null;
    const next: VNode | undefined = node.children[seg];
    if (!next) return null;
    node = next;
  }
  return node;
}

/** Display form of an absolute path, with `$HOME` collapsed to `~`. */
export function tildify(abs: string, home: string): string {
  if (abs === home) return '~';
  if (abs.startsWith(`${home}/`)) return `~${abs.slice(home.length)}`;
  return abs;
}

export function basename(abs: string) {
  return abs.split('/').filter(Boolean).pop() ?? '/';
}

export function dirname(abs: string) {
  const parts = abs.split('/').filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`;
}
