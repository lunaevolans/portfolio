import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import type { APIContext, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { site } from '../../config/site';
import { themes } from '../../lib/themes';

const require = createRequire(import.meta.url);
const font = (pkg: string, file: string) => readFile(require.resolve(`${pkg}/files/${file}`));

export const getStaticPaths = (async () => {
  const [projects, posts] = await Promise.all([getCollection('projects'), getCollection('blog', (p) => !p.data.draft)]);
  return [
    { params: { slug: 'default' }, props: { title: site.name, subtitle: site.title, kicker: `${site.handle}.github.io` } },
    ...projects.map((p) => ({
      params: { slug: `projects/${p.id}` },
      props: { title: p.data.title, subtitle: p.data.summary, kicker: `~/projects/${p.id}` },
    })),
    ...posts.map((p) => ({
      params: { slug: `blog/${p.id}` },
      props: { title: p.data.title, subtitle: p.data.description, kicker: `~/blog · ${p.data.date.toISOString().slice(0, 10)}` },
    })),
  ];
}) satisfies GetStaticPaths;

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export async function GET({ props }: APIContext) {
  const { title, subtitle, kicker } = props as { title: string; subtitle: string; kicker: string };
  const p = themes.bazzite.palette;
  const [inter, interBold, mono] = await Promise.all([
    font('@fontsource/inter', 'inter-latin-400-normal.woff'),
    font('@fontsource/inter', 'inter-latin-800-normal.woff'),
    font('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'),
  ]);

  const svg = await satori(
    h(
      'div',
      {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: `radial-gradient(900px 500px at 0% 0%, ${p.accent}55, transparent), radial-gradient(800px 500px at 100% 20%, ${p.accent2}33, transparent), ${p.bg}`,
        color: p.fg,
        fontFamily: 'Inter',
      },
      [
        h('div', { display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'JetBrains Mono', fontSize: 26, color: p.accent3 }, [
          h('div', { display: 'flex', width: 18, height: 18, borderRadius: 9, background: p.green }),
          `${site.user}@${site.hostname}  ${kicker}`,
        ]),
        h('div', { display: 'flex', flexDirection: 'column', gap: 20 }, [
          h('div', { fontSize: title.length > 40 ? 64 : 80, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }, title),
          h(
            'div',
            { fontSize: 30, color: p.muted, lineHeight: 1.35, maxWidth: 980 },
            subtitle.length > 150 ? `${subtitle.slice(0, 147)}…` : subtitle,
          ),
        ]),
        h(
          'div',
          {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'JetBrains Mono',
            fontSize: 22,
            color: p.muted,
          },
          [
            h('div', { display: 'flex' }, site.title),
            h('div', {
              display: 'flex',
              height: 8,
              width: 360,
              borderRadius: 4,
              background: `linear-gradient(90deg, ${p.accent}, ${p.accent2}, ${p.accent3})`,
            }),
          ],
        ),
      ],
    ) as unknown as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Inter', data: inter, weight: 400, style: 'normal' },
        { name: 'Inter', data: interBold, weight: 800, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  );
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
