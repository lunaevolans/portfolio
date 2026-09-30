import { useData } from '../context';
import { Icon } from '../Icon';
import { ProjectArt } from './ProjectArt';

export default function ProjectDetail({ slug }: { slug: string }) {
  const { projects, base } = useData();
  const p = projects.find((x) => x.slug === slug);
  if (!p) return <div class="app pad mono">cat: {slug}.md: No such file or directory</div>;
  return (
    <article class="app project-detail">
      <div class="pd-hero">
        <ProjectArt seed={p.slug} category={p.category} />
        <div class="pd-hero-text">
          <p class="mono pd-kicker">
            <span class={`status s-${p.status}`}>{p.status}</span> {p.role} · {p.year}
          </p>
          <h1 class="pd-title">{p.title}</h1>
          <p class="pd-summary">{p.summary}</p>
        </div>
      </div>
      {p.metrics.length > 0 && (
        <dl class="pd-metrics">
          {p.metrics.map((m) => (
            <div>
              <dt class="mono">{m.label}</dt>
              <dd class="grad-text">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p class="pd-stack">
        {p.stack.map((s) => (
          <span class="chip">{s}</span>
        ))}
      </p>
      <div class="prose" dangerouslySetInnerHTML={{ __html: p.html }} />
      <p class="pd-links">
        {p.links.repo && (
          <a class="btn" href={p.links.repo} target="_blank" rel="noopener">
            <Icon name="github" /> Source
          </a>
        )}
        {p.links.live && (
          <a class="btn primary" href={p.links.live} target="_blank" rel="noopener">
            <Icon name="external" /> Live
          </a>
        )}
        <a class="btn" href={`${base}projects/${p.slug}/`}>
          <Icon name="file" /> Permalink
        </a>
      </p>
    </article>
  );
}
