import { useStore } from '@nanostores/preact';
import { useEffect, useRef } from 'preact/hooks';
import { clusterPoints, featureImportance, forecastSeries, rocCurves, SEGMENTS } from '../../lib/datasets';
import { $theme } from '../../lib/stores';
import { themes } from '../../lib/themes';
import type { LabData } from '../../lib/types';

/** Observable Plot chart, re-rendered when the theme or container width changes. */
export function Chart({ kind }: { kind: LabData['chart'] }) {
  const host = useRef<HTMLDivElement>(null);
  const theme = useStore($theme);

  useEffect(() => {
    let alive = true;
    let ro: ResizeObserver | undefined;
    (async () => {
      const Plot = await import('@observablehq/plot');
      const el = host.current;
      if (!alive || !el) return;
      const p = themes[theme].palette;
      const render = () => {
        const width = Math.max(280, el.clientWidth);
        const base = {
          width,
          height: Math.round(Math.min(360, Math.max(220, width * 0.5))),
          marginLeft: 48,
          style: {
            background: 'transparent',
            color: p.muted,
            fontFamily: "'JetBrains Mono Variable', monospace",
            fontSize: '11px',
            overflow: 'visible',
          },
          grid: true,
        };
        let chart: SVGSVGElement | HTMLElement;
        if (kind === 'forecast') {
          const data = forecastSeries();
          chart = Plot.plot({
            ...base,
            x: { label: 'week →' },
            y: { label: '↑ units / week' },
            marks: [
              Plot.areaY(
                data.filter((d) => d.lo !== undefined),
                { x: 'week', y1: 'lo', y2: 'hi', fill: p.accent, fillOpacity: 0.18, curve: 'monotone-x' },
              ),
              Plot.ruleX([51], { stroke: p.border, strokeDasharray: '3,3' }),
              Plot.lineY(
                data.filter((d) => d.actual !== undefined),
                { x: 'week', y: 'actual', stroke: p.fg, strokeWidth: 1.6, curve: 'monotone-x' },
              ),
              Plot.lineY(
                data.filter((d) => d.forecast !== undefined),
                { x: 'week', y: 'forecast', stroke: p.accent2, strokeWidth: 2.2, strokeDasharray: '5,4', curve: 'monotone-x' },
              ),
              Plot.dot(
                data.filter((d) => d.week > 51 && d.actual !== undefined),
                { x: 'week', y: 'actual', fill: p.accent3, r: 3.5, tip: true },
              ),
              Plot.text([{ week: 52, y: 330 }], { x: 'week', y: 'y', text: () => 'forecast →', fill: p.accent2, textAnchor: 'start' }),
            ],
          });
        } else if (kind === 'clusters') {
          chart = Plot.plot({
            ...base,
            grid: false,
            x: { label: 'UMAP-1', ticks: 0 },
            y: { label: 'UMAP-2', ticks: 0 },
            color: { domain: SEGMENTS, range: [p.accent, p.accent3, p.accent2, p.yellow], legend: true },
            marks: [Plot.dot(clusterPoints(), { x: 'x', y: 'y', fill: 'segment', r: 2.6, fillOpacity: 0.75, tip: true })],
          });
        } else if (kind === 'roc') {
          chart = Plot.plot({
            ...base,
            x: { label: 'false positive rate →', domain: [0, 1] },
            y: { label: '↑ true positive rate', domain: [0, 1] },
            color: { range: [p.accent2, p.muted, p.border], legend: true },
            marks: [
              Plot.areaY(
                rocCurves().filter((d) => d.model.startsWith('gradient')),
                { x: 'fpr', y: 'tpr', fill: p.accent2, fillOpacity: 0.1 },
              ),
              Plot.line(rocCurves(), { x: 'fpr', y: 'tpr', stroke: 'model', strokeWidth: 2 }),
              Plot.ruleX([0.2], { stroke: p.accent3, strokeDasharray: '3,3' }),
            ],
          });
        } else {
          chart = Plot.plot({
            ...base,
            marginLeft: 180,
            x: { label: 'mean |SHAP| →' },
            y: { label: null },
            marks: [
              Plot.barX(featureImportance(), { x: 'value', y: 'feature', sort: { y: '-x' }, fill: p.accent, rx: 3, tip: true }),
              Plot.text(featureImportance(), {
                x: 'value',
                y: 'feature',
                text: (d: { value: number }) => d.value.toFixed(3),
                dx: 6,
                textAnchor: 'start',
                fill: p.fg,
              }),
            ],
          });
        }
        el.replaceChildren(chart);
      };
      render();
      let w = el.clientWidth;
      ro = new ResizeObserver(() => {
        if (Math.abs(el.clientWidth - w) > 24) {
          w = el.clientWidth;
          render();
        }
      });
      ro.observe(el);
    })();
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [kind, theme]);

  return <div ref={host} class="chart" role="img" aria-label={`${kind} chart`} />;
}
