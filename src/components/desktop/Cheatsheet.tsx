import { useStore } from '@nanostores/preact';
import { useEffect, useRef } from 'preact/hooks';
import { $cheatsheet } from '../../lib/stores';
import { KEYBINDS } from '../../lib/wm/keybinds';

export function Cheatsheet() {
  const open = useStore($cheatsheet);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div class="overlay" onPointerDown={(e) => e.target === e.currentTarget && $cheatsheet.set(false)}>
      <div class="cheatsheet" role="dialog" aria-modal="true" aria-labelledby="cs-title">
        <header>
          <h2 id="cs-title" class="mono">
            <span class="grad-text">~/.config/hypr/</span>keybinds.conf
          </h2>
          <button type="button" ref={ref} class="btn" onClick={() => $cheatsheet.set(false)}>
            close <kbd>esc</kbd>
          </button>
        </header>
        <p class="muted">
          <kbd>Mod</kbd> is <kbd>Alt</kbd> (or <kbd>Super</kbd> where the OS lets it through).
        </p>
        <dl>
          {KEYBINDS.map((k) => (
            <div class="kb-row">
              <dt class="mono">{k.keys}</dt>
              <dd>{k.action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
