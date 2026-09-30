import { useStore } from '@nanostores/preact';
import { $toasts, dismissToast } from '../../lib/stores';

export function Toasts() {
  const toasts = useStore($toasts);
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          type="button"
          key={t.id}
          class={`toast tone-${t.tone ?? 'info'}`}
          onClick={() => dismissToast(t.id)}
          aria-label={`Dismiss: ${t.title}`}
        >
          <b>{t.title}</b>
          {t.body && <span>{t.body}</span>}
        </button>
      ))}
    </div>
  );
}
