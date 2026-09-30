import { useState } from 'preact/hooks';
import { useData } from '../context';
import { Icon } from '../Icon';
import { Chart } from './Chart';
import PyCell from './PyCell';

export default function Lab() {
  const { lab } = useData();
  const [slug, setSlug] = useState(lab[0]?.slug);
  const nb = lab.find((l) => l.slug === slug) ?? lab[0];

  return (
    <div class="app lab">
      <nav class="lab-side" aria-label="Notebooks">
        <p class="files-side-title mono">~/lab</p>
        {lab.map((l) => (
          <button
            type="button"
            class={`files-cat${l.slug === nb?.slug ? ' on' : ''}`}
            aria-pressed={l.slug === nb?.slug}
            onClick={() => setSlug(l.slug)}
          >
            <Icon name="flask" size={14} /> <span>{l.slug}.ipynb</span>
          </button>
        ))}
        <p class="lab-kernel mono">
          <span class="pulse" aria-hidden="true" /> kernel: python 3 (pyodide)
        </p>
      </nav>
      <div class="lab-main">
        {nb && (
          <>
            <section class="nb-cell md">
              <h2 class="nb-title">{nb.title}</h2>
              <p class="nb-q">
                <b>Question.</b> {nb.question}
              </p>
              <p class="nb-m">
                <b>Method.</b> {nb.method}
              </p>
              <p>
                {nb.stack.map((s) => (
                  <span class="chip">{s}</span>
                ))}
              </p>
            </section>
            <section class="nb-cell out" aria-label="Chart output">
              <p class="nb-prompt mono">
                Out[1]: <span class="muted">synthetic data, same shape as the real thing</span>
              </p>
              <Chart kind={nb.chart} key={nb.slug} />
            </section>
            {nb.metrics.length > 0 && (
              <dl class="nb-metrics">
                {nb.metrics.map((m) => (
                  <div>
                    <dt class="mono">{m.label}</dt>
                    <dd class="grad-text">{m.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <section class="nb-cell md prose" dangerouslySetInnerHTML={{ __html: nb.html }} />
          </>
        )}
        <PyCell />
      </div>
    </div>
  );
}
