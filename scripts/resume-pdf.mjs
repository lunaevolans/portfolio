#!/usr/bin/env node
/**
 * Render /resume/ to a PDF with headless Chromium (the print stylesheet applies).
 *   node scripts/resume-pdf.mjs [--out public/resume.pdf] [--dist dist]
 * Serves the built site from `dist/` with a tiny static server, prints, exits.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = opt('out', 'public/resume.pdf');
const dist = opt('dist', 'dist');
const base = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/');
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.json': 'application/json',
};

if (!existsSync(join(dist, 'resume', 'index.html'))) {
  console.error(`✗ ${dist}/resume/index.html not found. Run \`npm run build\` first.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  let path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (path.startsWith(base)) path = `/${path.slice(base.length)}`;
  let file = normalize(join(dist, path));
  if (!file.startsWith(normalize(dist))) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

try {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}${base}resume/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' } });
  await browser.close();
  console.log(`✓ wrote ${out}`);
} finally {
  server.close();
}
