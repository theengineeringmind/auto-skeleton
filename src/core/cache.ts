import type { SkeletonLayout } from './types';

/**
 * A small LRU cache for layouts. Keyed by whatever the caller chooses;
 * `layoutCacheKey` builds a key from a name and a container width, which is
 * what determines a layout in practice.
 */
export class LayoutCache {
  private readonly map = new Map<string, SkeletonLayout>();

  constructor(private readonly max = 100) {
    if (!(Number.isInteger(max) && max > 0))
      throw new RangeError('auto-skeleton: cache size must be a positive integer');
  }

  get size(): number {
    return this.map.size;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  get(key: string): SkeletonLayout | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Refresh recency.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: string, layout: SkeletonLayout): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, layout);
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
  }

  /**
   * The most recently stored layout whose key was built with
   * `layoutCacheKey(name, …)`, regardless of width. Lets a wrapper paint
   * something plausible on the very first frame and only re-measure when
   * the width turns out to differ.
   */
  latest(name: string): SkeletonLayout | undefined {
    const prefix = `${name}@`;
    let found: SkeletonLayout | undefined;
    for (const [key, value] of this.map) if (key.startsWith(prefix)) found = value;
    return found;
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

export function layoutCacheKey(name: string, width: number): string {
  return `${name}@${Math.round(width)}`;
}

/** Shared default cache used by framework wrappers when no cache is supplied. */
export const defaultLayoutCache = new LayoutCache();
