import { useStore } from '@nanostores/preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { apps, type AppId, type IconName } from '../../lib/apps';
import { fuzzyFilter } from '../../lib/fuzzy';
import { $cheatsheet, $launcher, $mode, $saver, reboot, setTheme } from '../../lib/stores';
import { themeIds, themes } from '../../lib/themes';
import { openApp } from '../../lib/wm/store';
import { useData } from '../context';
import { Icon } from '../Icon';

interface Entry {
  id: string;
  label: string;
  hint: string;
  group: 'apps' | 'projects' | 'posts' | 'themes' | 'actions';
  icon: IconName;
  run: () => void;
}

/** rofi-style launcher + command palette. */
export function Launcher({ onOpenApp }: { onOpenApp?: (app: AppId, opts?: Parameters<typeof openApp>[1]) => void }) {
  const open = useStore($launcher);
  const data = useData();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const launch = onOpenApp ?? ((app, opts) => void openApp(app, opts));

  const entries = useMemo<Entry[]>(
    () => [
      ...Object.values(apps)
        .filter((a) => a.launchable)
        .map((a) => ({
          id: `app:${a.id}`,
          label: a.title === a.path ? a.title : `${a.title}`,
          hint: `${a.path} · ${a.description}`,
          group: 'apps' as const,
          icon: a.icon,
          run: () => launch(a.id),
        })),
      ...data.projects.map((p) => ({
        id: `project:${p.slug}`,
        label: p.title,
        hint: `project · ${p.stack.slice(0, 3).join(', ')}`,
        group: 'projects' as const,
        icon: 'folder' as const,
        run: () => launch('project', { key: p.slug, props: { slug: p.slug }, title: p.title }),
      })),
      ...data.posts.map((p) => ({
        id: `post:${p.slug}`,
        label: p.title,
        hint: `post · ${p.date.slice(0, 10)}`,
        group: 'posts' as const,
        icon: 'book' as const,
        run: () => launch('post', { key: p.slug, props: { slug: p.slug }, title: p.title }),
      })),
      ...themeIds.map((id) => ({
        id: `theme:${id}`,
        label: `Theme: ${themes[id].name}`,
        hint: 'switch palette',
        group: 'themes' as const,
        icon: 'palette' as const,
        run: () => setTheme(id),
      })),
      {
        id: 'act:tty',
        label: 'Terminal mode (TTY)',
        hint: 'full-screen shell',
        group: 'actions',
        icon: 'terminal',
        run: () => $mode.set('tty'),
      },
      { id: 'act:lock', label: 'Lock screen', hint: 'hyprlock', group: 'actions', icon: 'lock', run: () => $saver.set('lock') },
      {
        id: 'act:saver',
        label: 'Screensaver (cmatrix)',
        hint: 'wake up, Neo',
        group: 'actions',
        icon: 'sparkle',
        run: () => $saver.set('saver'),
      },
      { id: 'act:reboot', label: 'Reboot', hint: 'replay the boot sequence', group: 'actions', icon: 'power', run: () => reboot() },
      { id: 'act:keys', label: 'Keyboard shortcuts', hint: '?', group: 'actions', icon: 'keyboard', run: () => $cheatsheet.set(true) },
      {
        id: 'act:resume',
        label: 'Download résumé (PDF)',
        hint: 'resume.pdf',
        group: 'actions',
        icon: 'pdf',
        run: () => window.open(`${data.base}resume.pdf`, '_blank', 'noopener'),
      },
    ],
    [data],
  );

  const results = useMemo(() => fuzzyFilter(entries, q, (e) => `${e.label} ${e.hint}`).slice(0, 40), [entries, q]);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!open) return null;

  const choose = (e: Entry | undefined) => {
    if (!e) return;
    $launcher.set(false);
    e.run();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[sel]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      $launcher.set(false);
    }
  };

  let lastGroup = '';
  return (
    <div class="overlay launcher-overlay" onPointerDown={(e) => e.target === e.currentTarget && $launcher.set(false)}>
      <div class="launcher" role="dialog" aria-modal="true" aria-label="Launcher">
        <div class="launcher-input">
          <Icon name="search" size={16} />
          <input
            ref={input}
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
            onKeyDown={onKey}
            placeholder="Search apps, projects, posts, themes, actions…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="launcher-list"
            aria-activedescendant={results[sel] ? `l-${results[sel]!.id}` : undefined}
            spellcheck={false}
            autocomplete="off"
          />
          <kbd>esc</kbd>
        </div>
        <ul class="launcher-list" id="launcher-list" role="listbox" ref={list}>
          {results.map((e, i) => {
            const header = !q && e.group !== lastGroup ? e.group : null;
            lastGroup = e.group;
            return (
              <>
                {header && (
                  <li class="launcher-group mono" role="presentation">
                    {header}
                  </li>
                )}
                <li
                  id={`l-${e.id}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === sel}
                  class={`launcher-item${i === sel ? ' sel' : ''}`}
                  onPointerMove={() => i !== sel && setSel(i)}
                  onClick={() => choose(e)}
                >
                  <span class="li-icon">
                    <Icon name={e.icon} size={16} />
                  </span>
                  <span class="li-label">{e.label}</span>
                  <span class="li-hint mono">{e.hint}</span>
                </li>
              </>
            );
          })}
          {!results.length && <li class="launcher-empty mono">no matches for “{q}”</li>}
        </ul>
        <footer class="launcher-foot mono">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>{results.length} results</span>
        </footer>
      </div>
    </div>
  );
}
