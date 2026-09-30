import { useMemo, useState } from 'preact/hooks';
import { useData, useLaunch } from '../context';
import { Icon } from '../Icon';
import { ProjectArt } from './ProjectArt';

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'platform', label: 'Platform' },
  { id: 'fullstack', label: 'Full-stack' },
  { id: 'data', label: 'Data & ML' },
  { id: 'tooling', label: 'Tooling' },
];

function tilt(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement;
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
  el.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
  el.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
}
function untilt(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.setProperty('--rx', '0deg');
  el.style.setProperty('--ry', '0deg');
}

export default function Projects() {
  const { projects } = useData();
  const launch = useLaunch();
  const [cat, setCat] = useState('all');
  const list = useMemo(() => projects.filter((p) => cat === 'all' || p.category === cat), [projects, cat]);

  return (
    <div class="app files">
      <nav class="files-side" aria-label="Project categories">
        <p class="files-side-title mono">places</p>
        {CATS.map((c) => {
          const n = c.id === 'all' ? projects.length : projects.filter((p) => p.category === c.id).length;
          return (
            <button type="button" class={`files-cat${cat === c.id ? ' on' : ''}`} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              <Icon name="folder" size={14} /> {c.label} <span class="muted">{n}</span>
            </button>
          );
        })}
      </nav>
      <div class="files-main">
        <p class="files-crumb mono">
          <span class="muted">~/</span>projects/{cat === 'all' ? '' : `${cat}/`}
          <span class="muted"> · {list.length} items</span>
        </p>
        <ul class="project-grid">
          {list.map((p, i) => (
            <li style={{ '--i': i }}>
              <button
                type="button"
                class="project-card"
                onPointerMove={tilt}
                onPointerLeave={untilt}
                onClick={() => launch('project', { key: p.slug, props: { slug: p.slug }, title: p.title })}
                aria-label={`${p.title}: ${p.summary}`}
              >
                <ProjectArt seed={p.slug} category={p.category} />
                <span class="pc-body">
                  <span class="pc-top mono">
                    <span class={`status s-${p.status}`}>{p.status}</span>
                    <span class="muted">{p.year}</span>
                    {p.featured && (
                      <span class="star" title="featured">
                        ★
                      </span>
                    )}
                  </span>
                  <span class="pc-title">{p.title}</span>
                  <span class="pc-summary">{p.summary}</span>
                  {p.metrics[0] && (
                    <span class="pc-metrics mono">
                      {p.metrics.slice(0, 2).map((m) => (
                        <span>
                          <b>{m.value}</b> {m.label}
                        </span>
                      ))}
                    </span>
                  )}
                  <span class="pc-stack">
                    {p.stack.slice(0, 4).map((s) => (
                      <span class="chip">{s}</span>
                    ))}
                    {p.stack.length > 4 && <span class="chip">+{p.stack.length - 4}</span>}
                  </span>
                </span>
                <span class="pc-glare" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
