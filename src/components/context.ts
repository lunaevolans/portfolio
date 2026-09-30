import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { PortfolioData } from '../lib/types';
import type { AppId } from '../lib/apps';
import { openApp, type OpenOptions } from '../lib/wm/store';
export const DataContext = createContext<PortfolioData | null>(null);

export function useData(): PortfolioData {
  const d = useContext(DataContext);
  if (!d) throw new Error('DataContext missing');
  return d;
}

export type LaunchFn = (app: AppId, opts?: OpenOptions) => void;
export const LaunchContext = createContext<LaunchFn>((app, opts) => void openApp(app, opts));
/** Open an app the right way for the current shell (window on desktop, sheet on mobile). */
export const useLaunch = () => useContext(LaunchContext);
