import type { APIContext } from 'astro';
import { withBase } from '../lib/url';

export function GET({ site }: APIContext) {
  const sitemap = new URL(withBase('sitemap-index.xml'), site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, { headers: { 'Content-Type': 'text/plain' } });
}
