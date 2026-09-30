import { useState } from 'preact/hooks';

const DEFAULT = `import numpy as np
rng = np.random.default_rng(42)

# 8 weeks of daily demand with weekly seasonality
t = np.arange(8 * 7)
demand = 120 + 25 * np.sin(2 * np.pi * t / 7) + rng.normal(0, 8, t.size)

weekly = demand.reshape(-1, 7)
print("mean / day      :", demand.mean().round(1))
print("weekday profile :", weekly.mean(0).round(0).astype(int))
print("seasonal amp.   :", (np.ptp(weekly.mean(0)) / 2).round(1))
f"next Monday ≈ {weekly[:, 0].mean():.0f} units"`;

/** A live Python cell running CPython in WebAssembly (Pyodide), loaded on first run. */
export default function PyCell() {
  const [code, setCode] = useState(DEFAULT);
  const [out, setOut] = useState<{ text: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [runs, setRuns] = useState(0);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setOut(null);
    try {
      const { runPython } = await import('../../lib/pyodide');
      const t0 = performance.now();
      const r = await runPython(code, (m) => setStatus(m));
      const ms = Math.round(performance.now() - t0);
      setOut({
        text: [r.stdout.trimEnd(), r.result ? `Out: ${r.result}` : '', r.stderr.trimEnd()].filter(Boolean).join('\n') || '(no output)',
        err: !!r.stderr,
      });
      setStatus(`done in ${ms} ms`);
      setRuns((n) => n + 1);
    } catch (e) {
      setOut({ text: `Could not start Python: ${e instanceof Error ? e.message : String(e)}`, err: true });
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="nb-cell code" aria-label="Live Python cell">
      <p class="nb-prompt mono">
        In [{busy ? '*' : runs || ' '}]: <span class="muted">python · pyodide (CPython → WebAssembly)</span>
      </p>
      <textarea
        class="py-editor mono"
        value={code}
        spellcheck={false}
        aria-label="Python code"
        onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
            e.preventDefault();
            void run();
          } else if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.target as HTMLTextAreaElement;
            const s = ta.selectionStart;
            setCode(code.slice(0, s) + '    ' + code.slice(ta.selectionEnd));
            requestAnimationFrame(() => ta.setSelectionRange(s + 4, s + 4));
          }
        }}
        rows={Math.min(16, code.split('\n').length + 1)}
      />
      <div class="py-actions">
        <button type="button" class="btn primary" onClick={run} disabled={busy}>
          ▶ {busy ? 'running…' : 'Run'} <kbd>⇧↵</kbd>
        </button>
        <span class="mono muted py-status" role="status">
          {busy && <span class="spinner" aria-hidden="true" />} {status}
        </span>
      </div>
      {out && <pre class={`py-out mono${out.err ? ' err' : ''}`}>{out.text}</pre>}
    </section>
  );
}
