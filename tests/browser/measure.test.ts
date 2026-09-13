import { afterEach, describe, expect, it } from 'vitest';
import { createSkeleton, measure, renderSkeleton } from '../../src';
import { CARD_HTML, cleanup, mount } from './fixtures';

afterEach(cleanup);

function within(
  layout: { width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    b.x >= -0.01 &&
    b.y >= -0.01 &&
    b.x + b.width <= layout.width + 0.01 &&
    b.y + b.height <= layout.height + 0.01
  );
}

describe('measure in a real browser', () => {
  it('describes a profile card with the expected blocks', () => {
    const card = mount(CARD_HTML);
    const layout = measure(card);

    expect(layout.width).toBe(320);
    expect(layout.height).toBeGreaterThan(200);
    for (const b of layout.blocks) expect(within(layout, b), JSON.stringify(b)).toBe(true);

    const kinds = layout.blocks.reduce<Record<string, number>>(
      (acc, b) => ((acc[b.kind] = (acc[b.kind] ?? 0) + 1), acc),
      {},
    );
    // avatar + badge are small decorated boxes, cover image is media, two buttons are controls.
    expect(kinds['box']).toBe(2);
    expect(kinds['media']).toBe(1);
    expect(kinds['control']).toBe(2);

    // name, handle, and a bio that wraps to several lines at 288px of text width
    expect(kinds['text']).toBeGreaterThanOrEqual(4);
  });

  it('copies border radius from the source', () => {
    const card = mount(CARD_HTML);
    const layout = measure(card);
    const boxes = layout.blocks.filter((b) => b.kind === 'box');
    expect(boxes.map((b) => b.radius).sort()).toEqual(['50%', '999px']);
    expect(layout.blocks.find((b) => b.kind === 'media')?.radius).toBe('8px');
    expect(layout.blocks.filter((b) => b.kind === 'control').every((b) => b.radius === '6px')).toBe(true);
  });

  it('positions blocks where the source elements are', () => {
    const card = mount(CARD_HTML);
    const layout = measure(card);
    const avatar = layout.blocks.find((b) => b.kind === 'box' && b.radius === '50%')!;
    const avatarRect = card.querySelector('.avatar')!.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    expect(avatar).toMatchObject({ x: 16, y: avatarRect.top - cardRect.top, width: 40, height: 40 });

    const img = card.querySelector('img')!;
    const media = layout.blocks.find((b) => b.kind === 'media')!;
    const expected = img.getBoundingClientRect();
    expect(media.x).toBeCloseTo(expected.left - cardRect.left, 1);
    expect(media.y).toBeCloseTo(expected.top - cardRect.top, 1);
    expect(media.width).toBeCloseTo(expected.width, 1);
  });

  it('produces one bar per wrapped line and scales bar height', () => {
    const p = mount(
      `<p style="width: 200px; margin: 0; font: 16px/24px system-ui, sans-serif;">The quick brown fox jumps over the lazy dog again and again and again</p>`,
    );
    const range = document.createRange();
    range.selectNodeContents(p.firstChild!);
    const lines = range.getClientRects().length;
    expect(lines).toBeGreaterThan(1);

    const layout = measure(p, { textScale: 0.5 });
    expect(layout.blocks).toHaveLength(lines);
    const glyphHeight = range.getClientRects()[0]!.height;
    for (const b of layout.blocks) {
      expect(b.kind).toBe('text');
      expect(b.height).toBeCloseTo(glyphHeight * 0.5, 1);
    }
    // Bars stack downwards by the line height.
    expect(layout.blocks[1]!.y - layout.blocks[0]!.y).toBeCloseTo(24, 0);
    // The last line is shorter than a full line.
    expect(layout.blocks.at(-1)!.width).toBeLessThan(layout.blocks[0]!.width);
  });

  it('merges inline fragments on a line and keeps flex siblings apart', () => {
    const el = mount(
      `<div style="width: 400px; font: 16px/24px system-ui, sans-serif;">
        <p style="margin:0">Hello <b>bold</b> <i>world</i></p>
        <div style="display:flex; justify-content: space-between;"><span>Left</span><span>Right</span></div>
      </div>`,
    );
    const layout = measure(el);
    const rows = new Map<number, number>();
    for (const b of layout.blocks) rows.set(Math.round(b.y), (rows.get(Math.round(b.y)) ?? 0) + 1);
    const counts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
    expect(counts).toEqual([1, 2]);
  });

  it('is unaffected by a hidden measuring root', () => {
    const visible = measure(mount(CARD_HTML));
    const hidden = measure(mount(CARD_HTML, 'visibility: hidden'));
    const clipped = measure(mount(CARD_HTML, 'position: absolute; clip-path: inset(50%); top: 0; left: 0'));
    expect(hidden).toEqual(visible);
    expect(clipped).toEqual(visible);
  });

  it('is unaffected by where the root sits on the page', () => {
    const a = measure(mount(CARD_HTML));
    const b = measure(mount(CARD_HTML, 'margin: 77px 0 0 133px'));
    expect(b).toEqual(a);
  });

  it('honours skip, block and custom classification', () => {
    const el = mount(
      `<div style="width: 300px; font: 16px/24px sans-serif;">
        <div data-auto-skeleton="skip"><p>ignored</p><img alt="" width="50" height="50"></div>
        <div data-auto-skeleton="block" style="height: 30px;"><p>collapsed</p></div>
        <p class="chip">chip</p>
      </div>`,
    );
    const layout = measure(el, { classify: (e) => (e.classList.contains('chip') ? 'block' : undefined) });
    expect(layout.blocks).toHaveLength(2);
    expect(layout.blocks.every((b) => b.kind === 'box')).toBe(true);
    expect(layout.blocks[0]).toMatchObject({ height: 30, width: 300 });
  });

  it('measures a root that is itself media', () => {
    const img = mount('<img alt="" width="64" height="48" style="border-radius: 4px; display:block">');
    expect(measure(img).blocks).toEqual([
      { x: 0, y: 0, width: 64, height: 48, radius: '4px', kind: 'media' },
    ]);
  });

  it('skips display:none, visibility:hidden and zero-opacity content', () => {
    const el = mount(
      `<div style="width: 300px; font: 16px/24px sans-serif;">
        <p style="display:none">a</p>
        <p style="visibility:hidden">b</p>
        <p style="opacity:0">c</p>
        <p>d</p>
      </div>`,
    );
    expect(measure(el).blocks).toHaveLength(1);
  });

  it('respects nested inheritance of visibility', () => {
    const el = mount(
      `<div style="width: 300px; font: 16px/24px sans-serif; visibility: hidden;">
        <div><p>inherits hidden, still measured</p></div>
        <p style="visibility: visible">explicitly visible</p>
      </div>`,
    );
    expect(measure(el).blocks).toHaveLength(2);
  });
});

describe('renderSkeleton in a real browser', () => {
  it('paints blocks with the default colours and shimmer', () => {
    const card = mount(CARD_HTML);
    const skeleton = renderSkeleton(measure(card));
    document.body.appendChild(skeleton);

    const cs = getComputedStyle(skeleton);
    expect(cs.position).toBe('relative');
    expect(cs.overflow).toBe('hidden');
    expect(['content', 'layout style paint']).toContain(cs.contain);

    const block = skeleton.firstElementChild as HTMLElement;
    const bs = getComputedStyle(block);
    expect(bs.position).toBe('absolute');
    expect(bs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    // The sweep is a transform animation on a pseudo-element the width of the
    // container, offset by the block's x so all blocks show one sweep.
    const after = getComputedStyle(block, '::after');
    expect(after.animationName).toBe('auto-skeleton-sweep');
    expect(after.width).toBe('320px');
    expect(after.backgroundImage).toContain('linear-gradient');
    const second = skeleton.children[1] as HTMLElement;
    const layout = measure(card);
    expect(getComputedStyle(second, '::after').left).toBe(`${-layout.blocks[1]!.x}px`);
  });

  it('renders a static skeleton when animation is off', () => {
    const skeleton = renderSkeleton(measure(mount(CARD_HTML)), { animate: false });
    document.body.appendChild(skeleton);
    expect(getComputedStyle(skeleton.firstElementChild!, '::after').content).toBe('none');
  });

  it('honours CSS variables', () => {
    const skeleton = renderSkeleton(measure(mount(CARD_HTML)));
    skeleton.style.setProperty('--auto-skeleton-color', 'rgb(1, 2, 3)');
    document.body.appendChild(skeleton);
    expect(getComputedStyle(skeleton.firstElementChild!).backgroundColor).toBe('rgb(1, 2, 3)');
  });
});

describe('performance guard', () => {
  it('caps block count and stays fast on a large tree', () => {
    const rows = Array.from(
      { length: 400 },
      (_, i) => `<tr><td>Row ${i}</td><td>Value ${i}</td><td><button>Go</button></td></tr>`,
    );
    const table = mount(
      `<table style="width:600px;font:14px/20px sans-serif"><tbody>${rows.join('')}</tbody></table>`,
    );
    const t0 = performance.now();
    const capped = measure(table, { maxBlocks: 120 });
    const elapsed = performance.now() - t0;
    expect(capped.blocks.length).toBeLessThanOrEqual(120);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('createSkeleton', () => {
  it('returns a live handle that can update and destroy', () => {
    const card = mount(CARD_HTML);
    const handle = createSkeleton(card);
    document.body.appendChild(handle.element);
    const before = handle.layout;
    expect(handle.element.children).toHaveLength(before.blocks.length);

    card.style.width = '240px';
    const after = handle.update();
    expect(after.width).toBe(240);
    expect(handle.layout).toBe(after);
    expect(after.blocks.filter((b) => b.kind === 'text').length).toBeGreaterThan(
      before.blocks.filter((b) => b.kind === 'text').length,
    );
    expect(handle.element.children).toHaveLength(after.blocks.length);

    handle.destroy();
    expect(handle.element.isConnected).toBe(false);
  });
});
