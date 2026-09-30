import { useData } from '../context';

const fmt = (ym: string | null) => {
  if (!ym) return 'present';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' });
};

export default function Experience() {
  const { experience } = useData();
  return (
    <div class="app journal mono">
      <p class="journal-cmd">
        <span class="accent">$</span> journalctl --user -u career.service --no-pager
      </p>
      <ol class="journal-list">
        {experience.map((e) => (
          <li class="journal-entry">
            <p class="journal-meta">
              <time class="muted">
                {fmt(e.start)} → {fmt(e.end)}
              </time>{' '}
              <span class="accent2">{e.company}</span>
              <span class="muted">[{e.location}]</span>
            </p>
            <h3 class="journal-role">{e.role}</h3>
            <ul>
              {e.highlights.map((h) => (
                <li>
                  <span class="ok" aria-hidden="true">
                    ●
                  </span>{' '}
                  {h}
                </li>
              ))}
            </ul>
            <p class="journal-stack">
              {e.stack.map((s) => (
                <span class="chip">{s}</span>
              ))}
            </p>
          </li>
        ))}
      </ol>
      <p class="muted journal-end">-- No entries before {experience.at(-1)?.start.slice(0, 4)} --</p>
    </div>
  );
}
