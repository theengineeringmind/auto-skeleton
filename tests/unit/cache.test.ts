import { describe, expect, it } from 'vitest';
import { LayoutCache, layoutCacheKey } from '../../src/core/cache';
import type { SkeletonLayout } from '../../src/core/types';

const l = (n: number): SkeletonLayout => ({ width: n, height: n, blocks: [] });

describe('LayoutCache', () => {
  it('stores and retrieves layouts', () => {
    const cache = new LayoutCache();
    cache.set('a', l(1));
    expect(cache.get('a')).toEqual(l(1));
    expect(cache.has('a')).toBe(true);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it('evicts the least recently used entry', () => {
    const cache = new LayoutCache(2);
    cache.set('a', l(1));
    cache.set('b', l(2));
    cache.get('a'); // a is now most recent
    cache.set('c', l(3));
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });

  it('overwrites without growing', () => {
    const cache = new LayoutCache(2);
    cache.set('a', l(1));
    cache.set('a', l(2));
    expect(cache.size).toBe(1);
    expect(cache.get('a')).toEqual(l(2));
  });

  it('supports delete and clear', () => {
    const cache = new LayoutCache();
    cache.set('a', l(1));
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    cache.set('b', l(1));
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('returns the most recently stored layout for a name at any width', () => {
    const cache = new LayoutCache();
    expect(cache.latest('card')).toBeUndefined();
    cache.set(layoutCacheKey('card', 320), l(320));
    cache.set(layoutCacheKey('card', 480), l(480));
    cache.set(layoutCacheKey('cardigan', 100), l(100));
    expect(cache.latest('card')).toEqual(l(480));
    cache.get(layoutCacheKey('card', 320)); // touch → most recent
    expect(cache.latest('card')).toEqual(l(320));
  });

  it('rejects an invalid size', () => {
    expect(() => new LayoutCache(0)).toThrow(RangeError);
    expect(() => new LayoutCache(1.5)).toThrow(RangeError);
  });
});

describe('layoutCacheKey', () => {
  it('combines name and rounded width', () => {
    expect(layoutCacheKey('card', 319.6)).toBe('card@320');
  });
});
