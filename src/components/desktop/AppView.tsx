import type { Win } from '../../lib/wm/store';
import { Lazy } from '../Lazy';
import About from '../apps/About';
import Skills from '../apps/Skills';
import Experience from '../apps/Experience';
import Projects from '../apps/Projects';
import ProjectDetail from '../apps/ProjectDetail';
import Blog from '../apps/Blog';
import Contact from '../apps/Contact';
import Resume from '../apps/Resume';
import GitHubPanel from '../apps/GitHubPanel';

/** Maps a window to its application. Heavy apps are code-split. */
export function AppView({ win, embedded = true }: { win: Win; embedded?: boolean }) {
  switch (win.app) {
    case 'about':
      return <About />;
    case 'skills':
      return <Skills />;
    case 'experience':
      return <Experience />;
    case 'projects':
      return <Projects />;
    case 'project':
      return <ProjectDetail slug={win.props.slug ?? win.key ?? ''} />;
    case 'github':
      return <GitHubPanel />;
    case 'blog':
      return <Blog initial={win.props.slug} />;
    case 'post':
      return <Blog initial={win.props.slug ?? win.key} single />;
    case 'contact':
      return <Contact />;
    case 'resume':
      return <Resume />;
    case 'architecture':
      return <Lazy load={() => import('../apps/Architecture')} props={{}} label="spawning force simulation" />;
    case 'lab':
      return <Lazy load={() => import('../apps/Lab')} props={{}} label="starting kernel" />;
    case 'terminal':
      return <Lazy load={() => import('../terminal/Terminal')} props={{ embedded, winId: win.id }} label="spawning kitty" />;
  }
}
