/**
 * jsdom has no layout engine, so these tests stub the geometry APIs to
 * exercise the walker logic. Real measurements are covered in tests/browser.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { measure, resolveMeasureOptions } from '../../src/core/measure';

type Box = { left: number; top: number; width: number; height: number };
const boxes = new WeakMap<Node, Box | Box[]>();

function domRect(b: Box): DOMRect {
  return { ...b, x: b.left, y: b.top, right: b.left + b.width, bottom: b.top + b.height, toJSON: () => b };
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const b = boxes.get(this);
    return domRect(Array.isArray(b) ? b[0]! : (b ?? { left: 0, top: 0, width: 0, height: 0 }));
  });
  Range.prototype.getClientRects = function (this: Range) {
    const b = boxes.get(this.startContainer);
    const list = Array.isArray(b) ? b : b ? [b] : [];
    const rects = list.map(domRect);
    return Object.assign(rects, { item: (i: number) => rects[i] ?? null });
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  boxes.set(root, { left: 100, top: 50, width: 300, height: 200 });
  return root;
}

describe('resolveMeasureOptions', () => {
  it('fills defaults and ignores undefined', () => {
    const r = resolveMeasureOptions({ textScale: undefined, mergeGap: 10 });
    expect(r.textScale).toBe(0.7);
    expect(r.mergeGap).toBe(10);
  });
  it('validates maxBlocks', () => {
    expect(() => resolveMeasureOptions({ maxBlocks: 0 })).toThrow(RangeError);
    expect(() => resolveMeasureOptions({ maxBlocks: 2.5 })).toThrow(RangeError);
  });
  it('validates textScale', () => {
    expect(() => resolveMeasureOptions({ textScale: 0 })).toThrow(RangeError);
    expect(() => resolveMeasureOptions({ textScale: 1.5 })).toThrow(RangeError);
    expect(() => resolveMeasureOptions({ textScale: 1 })).not.toThrow();
  });
});

describe('measure (stubbed geometry)', () => {
  it('reports root size and converts coordinates to be root-relative', () => {
    const root = mount('<img alt="">');
    boxes.set(root.firstElementChild!, { left: 110, top: 60, width: 40, height: 40 });
    const layout = measure(root);
    expect(layout.width).toBe(300);
    expect(layout.height).toBe(200);
    expect(layout.blocks).toEqual([{ x: 10, y: 10, width: 40, height: 40, radius: '0px', kind: 'media' }]);
  });

  it('turns text nodes into scaled, merged bars', () => {
    const root = mount('<p>Hello <b>world</b></p>');
    const p = root.firstElementChild!;
    boxes.set(p.firstChild!, { left: 100, top: 50, width: 40, height: 20 });
    boxes.set(p.querySelector('b')!.firstChild!, { left: 142, top: 50, width: 40, height: 20 });
    const layout = measure(root);
    expect(layout.blocks).toEqual([{ x: 0, y: 3, width: 82, height: 14, radius: '4px', kind: 'text' }]);
  });

  it('produces one bar per wrapped line', () => {
    const root = mount('<p>long text</p>');
    boxes.set(root.firstElementChild!.firstChild!, [
      { left: 100, top: 50, width: 300, height: 20 },
      { left: 100, top: 70, width: 120, height: 20 },
    ]);
    const layout = measure(root, { textScale: 1 });
    expect(layout.blocks.map((b) => [b.y, b.width])).toEqual([
      [0, 300],
      [20, 120],
    ]);
  });

  it('skips whitespace-only text and skipped subtrees', () => {
    const root = mount('<div>   \n  </div><div data-auto-skeleton="skip"><img alt=""></div>');
    boxes.set(root.querySelector('img')!, { left: 100, top: 50, width: 40, height: 40 });
    expect(measure(root).blocks).toEqual([]);
  });

  it('paints a block for a whole subtree when asked', () => {
    const root = mount(
      '<div data-auto-skeleton="block" style="border-top-left-radius: 8px; border-top-right-radius: 8px; border-bottom-right-radius: 8px; border-bottom-left-radius: 8px"><p>text</p></div>',
    );
    boxes.set(root.firstElementChild!, { left: 100, top: 50, width: 300, height: 100 });
    const layout = measure(root);
    expect(layout.blocks).toEqual([{ x: 0, y: 0, width: 300, height: 100, radius: '8px', kind: 'box' }]);
  });

  it('measures a root that is itself a block', () => {
    const img = document.createElement('img');
    document.body.appendChild(img);
    boxes.set(img, { left: 5, top: 5, width: 50, height: 30 });
    expect(measure(img).blocks).toEqual([
      { x: 0, y: 0, width: 50, height: 30, radius: '0px', kind: 'media' },
    ]);
  });

  it('returns nothing for a root with display:none', () => {
    const root = mount('<img alt="">');
    root.style.display = 'none';
    expect(measure(root).blocks).toEqual([]);
  });

  it('drops blocks outside the root and below minSize', () => {
    const root = mount('<img alt=""><img alt=""><img alt="">');
    const [a, b, c] = Array.from(root.children);
    boxes.set(a!, { left: 500, top: 50, width: 40, height: 40 }); // outside
    boxes.set(b!, { left: 100, top: 50, width: 1, height: 40 }); // too thin
    boxes.set(c!, { left: 100, top: 50, width: 10, height: 10 });
    expect(measure(root).blocks).toHaveLength(1);
  });

  it('sorts blocks top to bottom, then left to right', () => {
    const root = mount('<img alt=""><img alt=""><img alt="">');
    const [a, b, c] = Array.from(root.children);
    boxes.set(a!, { left: 200, top: 50, width: 10, height: 10 });
    boxes.set(b!, { left: 100, top: 100, width: 10, height: 10 });
    boxes.set(c!, { left: 100, top: 50, width: 10, height: 10 });
    expect(measure(root).blocks.map((x) => [x.x, x.y])).toEqual([
      [0, 0],
      [100, 0],
      [0, 50],
    ]);
  });

  it('stops early once maxBlocks is reached', () => {
    const root = mount('<img alt="">'.repeat(50));
    let classified = 0;
    Array.from(root.children).forEach((c, i) =>
      boxes.set(c, { left: 100, top: 50 + i * 10, width: 10, height: 8 }),
    );
    const layout = measure(root, {
      maxBlocks: 5,
      classify: () => {
        classified++;
        return undefined;
      },
    });
    expect(layout.blocks).toHaveLength(5);
    expect(classified).toBeLessThanOrEqual(6); // root + 5 children, never the other 45
  });

  it('uses the custom classifier', () => {
    const root = mount('<p class="chip">text</p>');
    boxes.set(root.firstElementChild!, { left: 100, top: 50, width: 60, height: 20 });
    const layout = measure(root, { classify: (el) => (el.classList.contains('chip') ? 'block' : undefined) });
    expect(layout.blocks).toEqual([{ x: 0, y: 0, width: 60, height: 20, radius: '0px', kind: 'box' }]);
  });
});
