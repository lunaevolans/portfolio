import { useEffect, useState } from 'preact/hooks';
import { site } from '../../config/site';
import { fetchGithub, timeAgo, type GithubSummary } from '../../lib/github';
import { Icon } from '../Icon';

const LANG_COLORS = ['var(--c-accent)', 'var(--c-accent2)', 'var(--c-accent3)', 'var(--c-yellow)', 'var(--c-green)', 'var(--c-blue)'];

export default function GitHubPanel() {
  const [data, setData] = useState<GithubSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setErr(null);
    fetchGithub(site.github, ctl.signal)
      .then(setData)
      .catch((e: unknown) => !ctl.signal.aborted && setErr(e instanceof Error ? e.message : String(e)));
    return () => ctl.abort();
  }, [attempt]);

  if (err)
    return (
      <div class="app gh pad mono">
        <p class="err">✗ {err}</p>
        <p class="muted">The panel reads the public GitHub API from your browser (60 requests/hour/IP).</p>
        <p>
          <button type="button" class="btn" onClick={() => setAttempt((a) => a + 1)}>
            retry
          </button>{' '}
          <a class="btn" href={`https://github.com/${site.github}`} target="_blank" rel="noopener">
            <Icon name="github" /> open profile
          </a>
        </p>
      </div>
    );

  if (!data)
    return (
      <div class="app gh pad mono" role="status">
        <span class="spinner" aria-hidden="true" /> gh api users/{site.github} …
        <div class="skeleton" />
        <div class="skeleton short" />
      </div>
    );

  const max = Math.max(1, ...data.activity);
  const repos = data.repos.filter((r) => !r.fork).slice(0, 8);
  const stars = data.repos.reduce((n, r) => n + r.stars, 0);

  return (
    <div class="app gh">
      <header class="gh-head">
        <img src={data.user.avatar} alt="" width={44} height={44} loading="lazy" />
        <div>
          <p class="gh-name">{data.user.name ?? data.user.login}</p>
          <a class="mono muted" href={data.user.url} target="_blank" rel="noopener">
            @{data.user.login}
          </a>
        </div>
        <span class="gh-live mono" title={`fetched ${timeAgo(new Date(data.fetchedAt).toISOString())}`}>
          <span class="pulse" aria-hidden="true" /> live
        </span>
      </header>
      <dl class="gh-stats mono">
        <div>
          <dt>repos</dt>
          <dd>{data.user.publicRepos}</dd>
        </div>
        <div>
          <dt>stars</dt>
          <dd>{stars}</dd>
        </div>
        <div>
          <dt>followers</dt>
          <dd>{data.user.followers}</dd>
        </div>
        <div>
          <dt>since</dt>
          <dd>{new Date(data.user.createdAt).getFullYear()}</dd>
        </div>
      </dl>

      <section aria-label="Activity, last 30 days">
        <h3 class="gh-h mono">activity · 30d</h3>
        <div class="gh-spark" role="img" aria-label={`${data.activity.reduce((a, b) => a + b, 0)} public events in the last 30 days`}>
          {data.activity.map((v, i) => (
            <span style={{ height: `${Math.max(4, (v / max) * 100)}%`, '--i': i }} class={v ? 'on' : ''} title={`${v} events`} />
          ))}
        </div>
      </section>

      {data.languages.length > 0 && (
        <section aria-label="Languages">
          <h3 class="gh-h mono">languages</h3>
          <div class="gh-langbar" aria-hidden="true">
            {data.languages.map((l, i) => (
              <span style={{ width: `${l.share * 100}%`, background: LANG_COLORS[i % LANG_COLORS.length] }} />
            ))}
          </div>
          <ul class="gh-langs mono">
            {data.languages.map((l, i) => (
              <li>
                <i style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} /> {l.name}{' '}
                <span class="muted">{(l.share * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Recently pushed repositories">
        <h3 class="gh-h mono">recently pushed</h3>
        {repos.length ? (
          <ul class="gh-repos">
            {repos.map((r) => (
              <li>
                <a href={r.url} target="_blank" rel="noopener" class="mono">
                  {r.name}
                </a>
                <span class="muted mono">
                  {r.language ?? '—'} · ★{r.stars} · {timeAgo(r.pushedAt)}
                </span>
                {r.description && <p>{r.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p class="muted mono">No public repos yet. The good stuff is coming.</p>
        )}
      </section>
    </div>
  );
}
