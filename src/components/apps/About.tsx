import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { site } from '../../config/site';
import { LOGO, neofetchRows } from '../../lib/neofetch';
import { $theme } from '../../lib/stores';
import { themes } from '../../lib/themes';
import { useLaunch } from '../context';
import { Icon } from '../Icon';

export default function About() {
  const theme = useStore($theme);
  const openApp = useLaunch();
  const [res, setRes] = useState<string | undefined>();
  useEffect(() => setRes(`${screen.width}x${screen.height}`), []);
  const rows = neofetchRows({ themeName: themes[theme].name, resolution: res, terminal: 'kitty' });

  return (
    <div class="app about">
      <div class="neofetch mono">
        <pre class="nf-logo" aria-hidden="true">
          {LOGO.join('\n')}
        </pre>
        <div class="nf-info">
          <p class="nf-title">
            <span class="accent">{site.user}</span>@<span class="accent">{site.hostname}</span>
          </p>
          <p class="nf-rule" aria-hidden="true">
            {'─'.repeat(site.user.length + site.hostname.length + 1)}
          </p>
          <dl>
            {rows.map(([k, v]) => (
              <div class="nf-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p class="nf-colors" aria-hidden="true">
            {['bg', 'red', 'green', 'yellow', 'blue', 'accent', 'accent3', 'fg'].map((c) => (
              <i style={{ background: `var(--c-${c === 'accent3' ? 'accent3' : c})` }} />
            ))}
          </p>
        </div>
      </div>

      <div class="about-hero">
        <h1 class="about-name">
          <span class="grad-text">{site.name}</span>
        </h1>
        <p class="about-title mono">{site.title}</p>
        <p class="about-tagline">{site.tagline}</p>
        {site.bio.map((b) => (
          <p class="about-bio">{b}</p>
        ))}
        <p class="about-status mono">
          <span class="pulse" aria-hidden="true" /> {site.availability}
        </p>
        <div class="about-actions">
          <button type="button" class="btn primary" onClick={() => openApp('projects')}>
            <Icon name="folder" /> See the work
          </button>
          <button type="button" class="btn" onClick={() => openApp('contact')}>
            <Icon name="mail" /> Get in touch
          </button>
          <button type="button" class="btn" onClick={() => openApp('resume')}>
            <Icon name="pdf" /> Résumé
          </button>
        </div>
      </div>
    </div>
  );
}
