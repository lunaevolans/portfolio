/** Public GitHub API client with sessionStorage caching (no token needed). */

export interface RepoSummary {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string;
  size: number;
  fork: boolean;
}

export interface GithubSummary {
  user: {
    login: string;
    name: string | null;
    avatar: string;
    url: string;
    followers: number;
    following: number;
    publicRepos: number;
    createdAt: string;
  };
  repos: RepoSummary[];
  languages: { name: string; share: number }[];
  /** Events per day for the last 30 days (oldest → newest). */
  activity: number[];
  fetchedAt: number;
}

const TTL = 10 * 60 * 1000;
const API = 'https://api.github.com';

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal, headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) {
    const limited = res.status === 403 || res.status === 429;
    throw new Error(limited ? 'GitHub API rate limit hit. Try again in a bit.' : `GitHub API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface ApiUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}
interface ApiRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  size: number;
  fork: boolean;
}
interface ApiEvent {
  created_at: string;
}

export function languageShares(repos: RepoSummary[]): { name: string; share: number }[] {
  const totals = new Map<string, number>();
  for (const r of repos) {
    if (!r.language || r.fork) continue;
    totals.set(r.language, (totals.get(r.language) ?? 0) + Math.max(r.size, 1));
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([name, n]) => ({ name, share: n / sum }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 6);
}

export function dailyActivity(events: { created_at: string }[], days = 30, now = Date.now()): number[] {
  const buckets = new Array<number>(days).fill(0);
  const dayMs = 86_400_000;
  for (const e of events) {
    const age = Math.floor((now - Date.parse(e.created_at)) / dayMs);
    if (age >= 0 && age < days) buckets[days - 1 - age]! += 1;
  }
  return buckets;
}

export async function fetchGithub(login: string, signal?: AbortSignal): Promise<GithubSummary> {
  const cacheKey = `luna.gh.${login}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as GithubSummary;
      if (Date.now() - parsed.fetchedAt < TTL) return parsed;
    }
  } catch {
    /* storage unavailable */
  }

  const [user, repos, events] = await Promise.all([
    get<ApiUser>(`/users/${login}`, signal),
    get<ApiRepo[]>(`/users/${login}/repos?per_page=100&sort=pushed`, signal),
    get<ApiEvent[]>(`/users/${login}/events/public?per_page=100`, signal).catch(() => [] as ApiEvent[]),
  ]);

  const repoList: RepoSummary[] = repos.map((r) => ({
    name: r.name,
    description: r.description,
    url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    pushedAt: r.pushed_at,
    size: r.size,
    fork: r.fork,
  }));

  const summary: GithubSummary = {
    user: {
      login: user.login,
      name: user.name,
      avatar: user.avatar_url,
      url: user.html_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      createdAt: user.created_at,
    },
    repos: repoList,
    languages: languageShares(repoList),
    activity: dailyActivity(events),
    fetchedAt: Date.now(),
  };
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(summary));
  } catch {
    /* ignore */
  }
  return summary;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  const units: [number, string][] = [
    [31_536_000, 'y'],
    [2_592_000, 'mo'],
    [86_400, 'd'],
    [3_600, 'h'],
    [60, 'm'],
  ];
  for (const [n, u] of units) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return 'just now';
}
