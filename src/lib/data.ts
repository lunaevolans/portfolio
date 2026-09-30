import { getCollection } from 'astro:content';
import type { PortfolioData } from './types';

const minutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).length / 220));

/** Collect every content collection into one serializable object (build time only). */
export async function loadPortfolioData(): Promise<PortfolioData> {
  const [projects, posts, lab, experience] = await Promise.all([
    getCollection('projects'),
    getCollection('blog', (p) => !p.data.draft),
    getCollection('lab'),
    getCollection('experience'),
  ]);

  return {
    projects: projects
      .sort((a, b) => a.data.order - b.data.order)
      .map((p) => ({
        slug: p.id,
        ...p.data,
        html: p.rendered?.html ?? '',
        body: p.body ?? '',
      })),
    posts: posts
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .map((p) => ({
        slug: p.id,
        title: p.data.title,
        description: p.data.description,
        date: p.data.date.toISOString(),
        tags: p.data.tags,
        html: p.rendered?.html ?? '',
        body: p.body ?? '',
        minutes: minutes(p.body ?? ''),
      })),
    lab: lab.sort((a, b) => a.data.order - b.data.order).map((l) => ({ slug: l.id, ...l.data, html: l.rendered?.html ?? '' })),
    experience: experience.map((e) => e.data).sort((a, b) => b.start.localeCompare(a.start)),
    base: import.meta.env.BASE_URL,
    buildTime: new Date().toISOString(),
  };
}
