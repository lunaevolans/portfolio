import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const metric = z.object({ label: z.string(), value: z.string() });

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    role: z.string(),
    year: z.number(),
    status: z.enum(['production', 'active', 'archived', 'research']),
    category: z.enum(['platform', 'fullstack', 'data', 'tooling']),
    stack: z.array(z.string()),
    metrics: z.array(metric).default([]),
    links: z.object({ repo: z.url().optional(), live: z.url().optional() }).default({}),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const lab = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/lab' }),
  schema: z.object({
    title: z.string(),
    question: z.string(),
    method: z.string(),
    /** Which bundled chart to render for this notebook. */
    chart: z.enum(['forecast', 'clusters', 'roc', 'importance']),
    metrics: z.array(metric).default([]),
    stack: z.array(z.string()),
    order: z.number().default(99),
  }),
});

const experience = defineCollection({
  loader: file('./src/content/experience.json'),
  schema: z.object({
    id: z.string(),
    company: z.string(),
    role: z.string(),
    start: z.string(),
    end: z.string().nullable(),
    location: z.string(),
    highlights: z.array(z.string()),
    stack: z.array(z.string()),
  }),
});

export const collections = { projects, blog, lab, experience };
