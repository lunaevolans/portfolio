/** Serializable data handed from Astro (build time) to the desktop island. */

export interface Metric {
  label: string;
  value: string;
}

export interface ProjectData {
  slug: string;
  title: string;
  summary: string;
  role: string;
  year: number;
  status: string;
  category: string;
  stack: string[];
  metrics: Metric[];
  links: { repo?: string; live?: string };
  featured: boolean;
  html: string;
  body: string;
}

export interface PostData {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  html: string;
  body: string;
  minutes: number;
}

export interface LabData {
  slug: string;
  title: string;
  question: string;
  method: string;
  chart: 'forecast' | 'clusters' | 'roc' | 'importance';
  metrics: Metric[];
  stack: string[];
  html: string;
}

export interface ExperienceData {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string | null;
  location: string;
  highlights: string[];
  stack: string[];
}

export interface PortfolioData {
  projects: ProjectData[];
  posts: PostData[];
  lab: LabData[];
  experience: ExperienceData[];
  base: string;
  buildTime: string;
}
