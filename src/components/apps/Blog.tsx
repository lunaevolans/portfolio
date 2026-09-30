import { useEffect, useState } from 'preact/hooks';
import { useData } from '../context';
import { Icon } from '../Icon';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });

export default function Blog({ initial, single = false }: { initial?: string; single?: boolean }) {
  const { posts, base } = useData();
  const [slug, setSlug] = useState<string | undefined>(initial ?? (single ? undefined : posts[0]?.slug));
  useEffect(() => {
    if (initial) setSlug(initial);
  }, [initial]);
  const post = posts.find((p) => p.slug === slug);

  const reader = post ? (
    <article class="blog-reader" key={post.slug}>
      <p class="mono muted blog-meta">
        <time dateTime={post.date}>{fmt(post.date)}</time> · {post.minutes} min read ·{' '}
        {post.tags.map((t) => (
          <span class="chip">#{t}</span>
        ))}
      </p>
      <h1 class="blog-title">{post.title}</h1>
      <p class="blog-lede">{post.description}</p>
      <div class="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      <p>
        <a class="btn" href={`${base}blog/${post.slug}/`}>
          <Icon name="external" /> Permalink
        </a>
      </p>
    </article>
  ) : (
    <p class="muted mono pad">select a post</p>
  );

  if (single) return <div class="app blog single">{reader}</div>;

  return (
    <div class="app blog">
      <nav class="blog-list" aria-label="Posts">
        <p class="files-side-title mono">
          ~/blog{' '}
          <a href={`${base}rss.xml`} class="muted" title="RSS feed">
            rss
          </a>
        </p>
        <ul>
          {posts.map((p) => (
            <li>
              <button
                type="button"
                class={`blog-item${p.slug === slug ? ' on' : ''}`}
                aria-current={p.slug === slug}
                onClick={() => setSlug(p.slug)}
              >
                <span class="blog-item-title">{p.title}</span>
                <span class="mono muted">{fmt(p.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div class="blog-main">{reader}</div>
    </div>
  );
}
