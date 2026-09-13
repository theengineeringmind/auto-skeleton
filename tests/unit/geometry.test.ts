import { describe, expect, it } from 'vitest';
import {
  isVisible,
  mergeLineRects,
  round,
  sameLine,
  scaleHeight,
  toRelative,
  union,
  type Rect,
} from '../../src/core/geometry';

const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

describe('round', () => {
  it('rounds to two decimals', () => {
    expect(round(1.005)).toBe(1); // float artefact, 1.005 is really 1.00499…
    expect(round(1.235)).toBe(1.24);
    expect(round(-2.555)).toBe(-2.56);
  });
});

describe('toRelative', () => {
  it('subtracts the origin and rounds', () => {
    const dom = { left: 110.123, top: 220.456, width: 50.001, height: 20.999 } as DOMRectReadOnly;
    expect(toRelative(dom, { left: 100, top: 200 })).toEqual({ x: 10.12, y: 20.46, width: 50, height: 21 });
  });
});

describe('scaleHeight', () => {
  it('keeps the vertical centre', () => {
    const scaled = scaleHeight(rect(0, 10, 100, 20), 0.5);
    expect(scaled).toEqual({ x: 0, y: 15, width: 100, height: 10 });
  });
  it('is identity at scale 1', () => {
    expect(scaleHeight(rect(3, 4, 5, 6), 1)).toEqual(rect(3, 4, 5, 6));
  });
});

describe('sameLine', () => {
  it('is true for rects sharing most of their vertical span', () => {
    expect(sameLine(rect(0, 0, 10, 20), rect(50, 2, 10, 20))).toBe(true);
  });
  it('is false for stacked rects', () => {
    expect(sameLine(rect(0, 0, 10, 20), rect(0, 20, 10, 20))).toBe(false);
    expect(sameLine(rect(0, 0, 10, 20), rect(0, 15, 10, 20))).toBe(false);
  });
  it('handles a tiny rect inside a tall one', () => {
    expect(sameLine(rect(0, 0, 10, 40), rect(20, 10, 10, 8))).toBe(true);
  });
});

describe('union', () => {
  it('returns the bounding box', () => {
    expect(union(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(0, 0, 15, 15));
  });
});

describe('mergeLineRects', () => {
  it('returns an empty list for no input', () => {
    expect(mergeLineRects([], 4)).toEqual([]);
  });

  it('merges fragments on the same line within the gap', () => {
    const out = mergeLineRects([rect(0, 0, 40, 16), rect(42, 0, 30, 16)], 4);
    expect(out).toEqual([rect(0, 0, 72, 16)]);
  });

  it('keeps fragments apart when the gap is too large', () => {
    const out = mergeLineRects([rect(0, 0, 40, 16), rect(60, 0, 30, 16)], 4);
    expect(out).toHaveLength(2);
  });

  it('keeps separate lines separate', () => {
    const out = mergeLineRects([rect(0, 0, 100, 16), rect(0, 20, 60, 16)], 4);
    expect(out).toEqual([rect(0, 0, 100, 16), rect(0, 20, 60, 16)]);
  });

  it('merges regardless of input order', () => {
    const out = mergeLineRects([rect(42, 0, 30, 16), rect(0, 20, 60, 16), rect(0, 0, 40, 16)], 4);
    expect(out).toEqual([rect(0, 0, 72, 16), rect(0, 20, 60, 16)]);
  });

  it('does not merge across columns whose lines align', () => {
    const left = [rect(0, 0, 100, 16), rect(0, 20, 80, 16)];
    const right = [rect(140, 0, 100, 16), rect(140, 20, 90, 16)];
    expect(mergeLineRects([...left, ...right], 4)).toHaveLength(4);
  });

  it('grows the line box so slightly offset inline fragments still join', () => {
    // A bold span 2px taller than its neighbours, common with mixed font weights.
    const out = mergeLineRects([rect(0, 1, 30, 16), rect(31, 0, 30, 18), rect(62, 1, 30, 16)], 4);
    expect(out).toEqual([rect(0, 0, 92, 18)]);
  });
});

describe('isVisible', () => {
  const bounds = { width: 200, height: 100 };
  it('drops rects below the minimum size', () => {
    expect(isVisible(rect(0, 0, 1, 10), bounds, 2)).toBe(false);
    expect(isVisible(rect(0, 0, 10, 1), bounds, 2)).toBe(false);
  });
  it('drops rects completely outside the bounds', () => {
    expect(isVisible(rect(-20, 0, 10, 10), bounds, 2)).toBe(false);
    expect(isVisible(rect(0, 100, 10, 10), bounds, 2)).toBe(false);
    expect(isVisible(rect(200, 0, 10, 10), bounds, 2)).toBe(false);
  });
  it('keeps partially visible rects', () => {
    expect(isVisible(rect(-5, -5, 10, 10), bounds, 2)).toBe(true);
    expect(isVisible(rect(195, 95, 10, 10), bounds, 2)).toBe(true);
  });
});
