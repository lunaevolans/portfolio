import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/** Code-split a heavy component; shows a terminal-style spinner while loading. */
export function Lazy<P extends object>({
  load,
  props,
  label = 'loading',
}: {
  load: () => Promise<{ default: ComponentType<P> }>;
  props: P;
  label?: string;
}) {
  const [Comp, setComp] = useState<ComponentType<P> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((m) => alive && setComp(() => m.default))
      .catch((e: unknown) => alive && setErr(String(e)));
    return () => {
      alive = false;
    };
  }, []);
  if (err) return <div class="lazy-state err mono">failed to load module: {err}</div>;
  if (!Comp)
    return (
      <div class="lazy-state mono" role="status">
        <span class="spinner" aria-hidden="true" /> {label}…
      </div>
    );
  return <Comp {...props} />;
}
