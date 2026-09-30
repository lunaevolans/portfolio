/** Deterministic generative cover art per project (no image assets needed). */
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function ProjectArt({ seed, category }: { seed: string; category: string }) {
  let h = hash(seed);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0), (h % 10000) / 10000);
  const nodes = Array.from({ length: 9 }, () => ({ x: 10 + rnd() * 180, y: 10 + rnd() * 80, r: 1.5 + rnd() * 3 }));
  const edges = nodes.flatMap((n, i) =>
    nodes
      .slice(i + 1)
      .filter((m) => Math.hypot(m.x - n.x, m.y - n.y) < 70)
      .map((m) => [n, m] as const),
  );
  const angle = Math.round(rnd() * 360);
  const bars = Array.from({ length: 18 }, () => 8 + rnd() * 60);
  return (
    <svg class="project-art" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`pg-${seed}`} gradientTransform={`rotate(${angle} .5 .5)`}>
          <stop offset="0" style="stop-color:var(--c-accent)" stop-opacity=".55" />
          <stop offset=".6" style="stop-color:var(--c-accent2)" stop-opacity=".25" />
          <stop offset="1" style="stop-color:var(--c-accent3)" stop-opacity=".45" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" style="fill:var(--c-bg)" />
      <rect width="200" height="100" fill={`url(#pg-${seed})`} />
      {category === 'data'
        ? bars.map((b, i) => (
            <rect
              x={6 + i * 10.8}
              y={96 - b}
              width="6"
              height={b}
              rx="1.5"
              style="fill:var(--c-fg)"
              opacity={0.12 + (i / bars.length) * 0.3}
            />
          ))
        : edges.map(([a, b]) => (
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style="stroke:var(--c-fg)" stroke-opacity=".22" stroke-width=".6" />
          ))}
      {category !== 'data' && nodes.map((n) => <circle cx={n.x} cy={n.y} r={n.r} style="fill:var(--c-fg)" opacity=".55" />)}
    </svg>
  );
}
