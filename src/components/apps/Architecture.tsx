import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { graphs, type ArchGraph, type ArchNode, type NodeKind } from '../../content/architecture';

type SimNode = ArchNode & SimulationNodeDatum;
interface SimLink {
  source: SimNode;
  target: SimNode;
  label?: string;
  async?: boolean;
}

const W = 1000;
const H = 620;
const NODE_W = 136;
const NODE_H = 40;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const KIND_COLOR: Record<NodeKind, string> = {
  client: 'var(--c-accent3)',
  edge: 'var(--c-blue)',
  service: 'var(--c-accent)',
  stream: 'var(--c-accent2)',
  data: 'var(--c-yellow)',
  ml: 'var(--c-green)',
  obs: 'var(--c-red)',
};
const KIND_LABEL: Record<NodeKind, string> = {
  client: 'client',
  edge: 'edge / platform',
  service: 'service',
  stream: 'streaming',
  data: 'data',
  ml: 'ML',
  obs: 'observability',
};

function layout(g: ArchGraph) {
  const lanes = g.tiers.length;
  const laneX = (t: number) => 90 + (t * (W - 180)) / Math.max(1, lanes - 1);
  const nodes: SimNode[] = g.nodes.map((n, i) => ({ ...n, x: laneX(n.tier), y: 120 + ((i * 97) % (H - 200)) }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: SimLink[] = g.edges.map((e) => ({ source: byId.get(e.from)!, target: byId.get(e.to)!, label: e.label, async: e.async }));
  const sim = forceSimulation(nodes)
    .force('link', forceLink<SimNode, SimLink>(links).distance(150).strength(0.12))
    .force('charge', forceManyBody().strength(-420))
    .force('x', forceX<SimNode>((d) => laneX(d.tier)).strength(1.2))
    .force('y', forceY(H / 2 + 20).strength(0.06))
    .force('collide', forceCollide(NODE_H * 0.95))
    .stop();
  sim.tick(320);
  for (const n of nodes) n.y = Math.max(90, Math.min(H - 40, n.y ?? 0));
  return { nodes, links, sim, laneX };
}

export default function Architecture() {
  const [gi, setGi] = useState(0);
  const graph = graphs[gi]!;
  const { nodes, links, sim, laneX } = useMemo(() => layout(graph), [graph]);
  const [, setFrame] = useState(0);
  const [selected, setSelected] = useState<string | null>(graph.nodes.find((n) => n.kind === 'stream')?.id ?? null);
  const [hover, setHover] = useState<string | null>(null);
  const [traffic, setTraffic] = useState(true);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ node?: SimNode; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);

  useEffect(() => {
    setSelected(graph.nodes.find((n) => n.kind === 'stream')?.id ?? graph.nodes[0]?.id ?? null);
    sim.on('tick', () => setFrame((f) => f + 1));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setTraffic(false);
    return () => void sim.stop().on('tick', null);
  }, [sim]);

  const toSvg = (e: PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k, sx, sy };
  };

  const onDown = (e: PointerEvent, node?: SimNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = toSvg(e);
    drag.current = { node, sx: p.sx, sy: p.sy, vx: view.x, vy: view.y, moved: false };
    svg.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toSvg(e);
    if (!d.moved && Math.hypot(p.sx - d.sx, p.sy - d.sy) < 4) return;
    d.moved = true;
    if (d.node) {
      d.node.fx = p.x;
      d.node.fy = p.y;
      sim.alphaTarget(0.25).restart();
    } else {
      setView((v) => ({ ...v, x: d.vx + (p.sx - d.sx), y: d.vy + (p.sy - d.sy) }));
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.node) {
      if (!d.moved) setSelected(d.node.id);
      d.node.fx = null;
      d.node.fy = null;
      sim.alphaTarget(0);
    } else if (!d.moved) setSelected(null);
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = svg.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { k, x: sx - ((sx - v.x) / v.k) * k, y: sy - ((sy - v.y) / v.k) * k };
    });
  };
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const focusId = hover ?? selected;
  const neighbours = useMemo(() => {
    const s = new Set<string>();
    if (!focusId) return s;
    s.add(focusId);
    for (const l of links) {
      if (l.source.id === focusId) s.add(l.target.id);
      if (l.target.id === focusId) s.add(l.source.id);
    }
    return s;
  }, [focusId, links]);

  const sel = nodes.find((n) => n.id === selected);
  const kinds = [...new Set(graph.nodes.map((n) => n.kind))];

  return (
    <div class="app arch">
      <div class="arch-toolbar">
        <div class="seg" role="tablist" aria-label="Diagram">
          {graphs.map((g, i) => (
            <button
              type="button"
              role="tab"
              aria-selected={i === gi}
              class={i === gi ? 'on' : ''}
              onClick={() => (setGi(i), setView({ x: 0, y: 0, k: 1 }))}
            >
              {g.id === 'system' ? 'System design' : 'Skill topology'}
            </button>
          ))}
        </div>
        <label class="toggle mono">
          <input type="checkbox" checked={traffic} onChange={(e) => setTraffic((e.target as HTMLInputElement).checked)} /> traffic
        </label>
        <button type="button" class="btn small" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
          reset view
        </button>
        <ul class="arch-legend mono" aria-label="Legend">
          {kinds.map((k) => (
            <li>
              <i style={{ background: KIND_COLOR[k] }} /> {KIND_LABEL[k]}
            </li>
          ))}
        </ul>
      </div>

      <div class="arch-body">
        <div class="arch-canvas">
          <p class="arch-title">
            <b>{graph.title}</b> <span class="muted">{graph.subtitle}</span>
          </p>
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            role="group"
            aria-label={`${graph.title} diagram. Nodes are focusable; press Enter for details.`}
            onPointerDown={(e) => onDown(e)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            class={traffic ? 'traffic' : ''}
          >
            <defs>
              <pattern id="arch-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" style="fill:var(--c-border)" />
              </pattern>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" style="fill:var(--c-muted)" />
              </marker>
            </defs>
            <rect width={W} height={H} style="fill:url(#arch-grid)" opacity=".6" />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {graph.tiers.map((t, i) => (
                <g class="lane">
                  <rect x={laneX(i) - NODE_W / 2 - 14} y={40} width={NODE_W + 28} height={H - 60} rx="16" />
                  <text x={laneX(i)} y={62} text-anchor="middle" class="lane-label">
                    {t}
                  </text>
                </g>
              ))}
              {links.map((l, i) => {
                const x1 = l.source.x ?? 0;
                const y1 = l.source.y ?? 0;
                const x2 = l.target.x ?? 0;
                const y2 = l.target.y ?? 0;
                // stop the line at the node box edge
                const dx = x2 - x1;
                const dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                const tEnd = Math.min(Math.abs((NODE_W / 2 + 4) / (dx || 1e-6)), Math.abs((NODE_H / 2 + 4) / (dy || 1e-6)));
                const ex = x2 - dx * Math.min(tEnd, 0.5);
                const ey = y2 - dy * Math.min(tEnd, 0.5);
                const active =
                  !focusId ||
                  (neighbours.has(l.source.id) && neighbours.has(l.target.id) && (l.source.id === focusId || l.target.id === focusId));
                const d = `M${x1},${y1} L${ex},${ey}`;
                return (
                  <g class={`edge${l.async ? ' async' : ''}${active ? '' : ' dim'}`}>
                    <path id={`e-${graph.id}-${i}`} d={d} marker-end="url(#arrow)" />
                    {traffic && active && (
                      <circle r={l.async ? 3.2 : 2.6} class="packet">
                        <animateMotion dur={`${(len / 120).toFixed(2)}s`} begin={`${(i % 7) * 0.35}s`} repeatCount="indefinite">
                          <mpath href={`#e-${graph.id}-${i}`} />
                        </animateMotion>
                      </circle>
                    )}
                    {l.label && active && focusId && (
                      <text x={(x1 + ex) / 2} y={(y1 + ey) / 2 - 6} text-anchor="middle" class="edge-label">
                        {l.label}
                      </text>
                    )}
                  </g>
                );
              })}
              {nodes.map((n) => {
                const x = (n.x ?? 0) - NODE_W / 2;
                const y = (n.y ?? 0) - NODE_H / 2;
                const dim = focusId && !neighbours.has(n.id);
                return (
                  <g
                    class={`node${n.id === selected ? ' sel' : ''}${dim ? ' dim' : ''}`}
                    transform={`translate(${x} ${y})`}
                    style={{ '--k': KIND_COLOR[n.kind] }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.label}: ${n.blurb}`}
                    aria-pressed={n.id === selected}
                    onPointerDown={(e) => onDown(e, n)}
                    onPointerEnter={() => setHover(n.id)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(n.id)}
                    onBlur={() => setHover(null)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(n.id))}
                  >
                    <rect width={NODE_W} height={NODE_H} rx="10" class="node-bg" />
                    <rect width="4" height={NODE_H - 16} x="8" y="8" rx="2" class="node-kind" />
                    <text x="20" y="17" class="node-label">
                      {clip(n.label, 15)}
                    </text>
                    <text x="20" y="31" class="node-tech">
                      {clip(n.tech.slice(0, 2).join(' · '), 20)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <p class="arch-hint mono muted">drag nodes · drag background to pan · scroll to zoom</p>
        </div>

        <aside class="arch-panel" aria-live="polite">
          {sel ? (
            <>
              <p class="mono arch-kind" style={{ color: KIND_COLOR[sel.kind] }}>
                {KIND_LABEL[sel.kind]} · {graph.tiers[sel.tier]}
              </p>
              <h3>{sel.label}</h3>
              <p>{sel.blurb}</p>
              <p>
                {sel.tech.map((t) => (
                  <span class="chip">{t}</span>
                ))}
              </p>
              <h4 class="mono">design decisions</h4>
              <ul class="decisions">
                {sel.decisions.map((d) => (
                  <li>{d}</li>
                ))}
              </ul>
              <h4 class="mono">connections</h4>
              <ul class="conns mono">
                {links
                  .filter((l) => l.source.id === sel.id || l.target.id === sel.id)
                  .map((l) => {
                    const out = l.source.id === sel.id;
                    const other = out ? l.target : l.source;
                    return (
                      <li>
                        <button type="button" class="linkish" onClick={() => setSelected(other.id)}>
                          {out ? '→' : '←'} {other.label}
                        </button>
                        <span class="muted">
                          {' '}
                          {l.async ? 'async' : 'sync'}
                          {l.label ? ` · ${l.label}` : ''}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </>
          ) : (
            <p class="muted mono">select a node to see why it exists.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
