import { useEffect, useState } from 'preact/hooks';
import { skills } from '../../config/site';

/** btop-style meters: each skill "uses" some CPU; the graph jitters a bit so it feels alive. */
export default function Skills() {
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 120);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = reduced ? 0 : setInterval(() => setTick((n) => n + 1), 1600);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);
  const jitter = (seed: number) => (tick ? Math.sin(tick * 1.7 + seed * 3.1) * 2.5 : 0);

  const all = skills.flatMap((g) => g.items);
  const avg = Math.round(all.reduce((a, s) => a + s.level, 0) / all.length);

  return (
    <div class="app btop mono">
      <div class="btop-head">
        <span>
          <b class="accent">btop</b> · skills
        </span>
        <span class="muted">
          load avg <b>{avg}%</b> · {all.length} procs
        </span>
      </div>
      <div class="btop-grid">
        {skills.map((g, gi) => (
          <section class="btop-box" aria-label={g.group}>
            <h3 class="btop-box-title">
              <span>¹{gi + 1}</span> {g.group}
            </h3>
            <ul>
              {g.items.map((s, i) => {
                const v = Math.max(0, Math.min(100, s.level + jitter(gi * 10 + i)));
                return (
                  <li class="meter">
                    <span class="meter-name">{s.name}</span>
                    <span
                      class="meter-bar"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={s.level}
                      aria-label={`${s.name} proficiency`}
                    >
                      <span
                        class="meter-fill"
                        style={{ width: shown ? `${v}%` : '0%', transitionDelay: tick ? '0s' : `${(gi * 4 + i) * 40}ms` }}
                      />
                    </span>
                    <span class="meter-val">{s.level}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
