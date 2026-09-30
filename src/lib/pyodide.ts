/** Lazy Pyodide loader (CPython compiled to WebAssembly), shared by the Lab and the terminal. */

export const PYODIDE_VERSION = '314.0.7';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export interface PyRuntime {
  runPythonAsync(code: string): Promise<unknown>;
  loadPackagesFromImports(code: string, opts?: { messageCallback?: (m: string) => void }): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): unknown };
}

let loading: Promise<PyRuntime> | null = null;

export function loadPython(onStatus?: (msg: string) => void): Promise<PyRuntime> {
  if (!loading) {
    onStatus?.('downloading CPython → WebAssembly (~7 MB, first run only)…');
    loading = (async () => {
      const mod = (await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)) as {
        loadPyodide(opts: { indexURL: string }): Promise<PyRuntime>;
      };
      const py = await mod.loadPyodide({ indexURL: INDEX_URL });
      return py;
    })().catch((err: unknown) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

/** Run code, capturing stdout/stderr. Returns the repr of the last expression, if any. */
export async function runPython(
  code: string,
  onStatus?: (msg: string) => void,
): Promise<{ stdout: string; stderr: string; result: string | null }> {
  const py = await loadPython(onStatus);
  let stdout = '';
  let stderr = '';
  py.setStdout({ batched: (s) => (stdout += `${s}\n`) });
  py.setStderr({ batched: (s) => (stderr += `${s}\n`) });
  await py.loadPackagesFromImports(code, { messageCallback: (m) => onStatus?.(m) });
  try {
    const value = await py.runPythonAsync(code);
    const result =
      value === undefined || value === null ? null : typeof value === 'object' && 'toString' in value ? String(value) : String(value);
    return { stdout, stderr, result };
  } catch (err) {
    return { stdout, stderr: stderr + String(err instanceof Error ? err.message : err), result: null };
  }
}
