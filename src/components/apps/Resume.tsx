import { useState } from 'preact/hooks';
import { useData } from '../context';
import { Icon } from '../Icon';

/** zathura-style viewer: embeds the printable /resume page. */
export default function Resume() {
  const { base } = useData();
  const [zoom, setZoom] = useState(100);
  return (
    <div class="app zathura">
      <div class="zathura-bar mono">
        <span class="muted">~/resume.pdf</span>
        <span class="zathura-tools">
          <button type="button" class="win-btn" onClick={() => setZoom((z) => Math.max(50, z - 10))} aria-label="Zoom out">
            −
          </button>
          <span>{zoom}%</span>
          <button type="button" class="win-btn" onClick={() => setZoom((z) => Math.min(160, z + 10))} aria-label="Zoom in">
            +
          </button>
        </span>
        <span class="zathura-actions">
          <a class="btn" href={`${base}resume.pdf`} download>
            <Icon name="pdf" /> PDF
          </a>
          <a class="btn" href={`${base}resume/`} target="_blank" rel="noopener">
            <Icon name="external" /> Open
          </a>
        </span>
      </div>
      <div class="zathura-page">
        <iframe
          src={`${base}resume/?embed=1`}
          title="Résumé"
          loading="lazy"
          style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
        />
      </div>
    </div>
  );
}
