import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { LayoutCache, MeasureOptions, SkeletonLayout, SkeletonTheme } from '../core';

/**
 * Defaults shared by every `<AutoSkeleton>` below the provider. Any prop set
 * on an individual component wins over these.
 */
export interface AutoSkeletonConfig extends MeasureOptions, SkeletonTheme {
  /** Run the shimmer animation. */
  animate?: boolean;
  /** Cross-fade duration in ms when content arrives. */
  fadeDuration?: number;
  /** Accessible label for loading regions. */
  label?: string;
  /** Inject the default stylesheet into the document. */
  injectStyles?: boolean;
  /** CSP nonce for the injected stylesheet. */
  nonce?: string;
  /** Cache instance for `cacheKey` lookups. */
  cache?: LayoutCache;
  /**
   * Precomputed layouts keyed by `cacheKey`. Used on the very first render,
   * including on the server, so skeletons stream down as real blocks with no
   * layout shift and no client-side measurement. Generate them once with
   * `measure()` in a browser (for example a Playwright script in CI) and
   * ship the JSON.
   */
  layouts?: Readonly<Record<string, SkeletonLayout>>;
  /** Called when measurement throws. The component falls back to `minHeight`. */
  onError?: (error: unknown) => void;
}

const AutoSkeletonContext = createContext<AutoSkeletonConfig>({});
AutoSkeletonContext.displayName = 'AutoSkeletonContext';

export interface AutoSkeletonProviderProps extends AutoSkeletonConfig {
  children?: ReactNode;
}

/**
 * Provide app-wide defaults (theme, cache, precomputed layouts, measure
 * options). Providers nest: inner values override outer ones per key.
 */
export function AutoSkeletonProvider({ children, ...config }: AutoSkeletonProviderProps): ReactNode {
  const parent = useContext(AutoSkeletonContext);
  const value = useMemo(() => mergeConfig(parent, config), [parent, config]);
  return <AutoSkeletonContext.Provider value={value}>{children}</AutoSkeletonContext.Provider>;
}

export function useAutoSkeletonConfig(): AutoSkeletonConfig {
  return useContext(AutoSkeletonContext);
}

/** Merge two configs, ignoring `undefined` so an explicit prop never erases a default. */
export function mergeConfig(base: AutoSkeletonConfig, override: AutoSkeletonConfig): AutoSkeletonConfig {
  const out: AutoSkeletonConfig = { ...base };
  for (const key of Object.keys(override) as (keyof AutoSkeletonConfig)[]) {
    const value = override[key];
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  if (base.layouts && override.layouts) out.layouts = { ...base.layouts, ...override.layouts };
  return out;
}
