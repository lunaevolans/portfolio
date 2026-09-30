/** Join a path onto the deploy base (`/` or `/portfolio/`). */
export function withBase(path: string, base: string = import.meta.env.BASE_URL): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  return b + path.replace(/^\//, '');
}
