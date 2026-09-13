/**
 * Runs a battery of realistic component patterns through `measure()` and
 * checks structural invariants rather than pixel values, so the suite is
 * stable across operating systems and font stacks.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { measure, type SkeletonBlock, type SkeletonLayout } from '../../src';
import {
  COMPONENTS,
  FORM,
  NAVBAR,
  PRICING,
  PRODUCT_GRID,
  COMMENTS,
  CHAT,
  CRUMBS_AND_PAGER,
  cleanupAll,
  mountFull,
} from './fixtures/components';

afterEach(cleanupAll);

const kinds = (layout: SkeletonLayout) =>
  layout.blocks.reduce<Record<string, number>>((acc, b) => ((acc[b.kind] = (acc[b.kind] ?? 0) + 1), acc), {});

function overlaps(a: SkeletonBlock, b: SkeletonBlock): boolean {
  const tolerance = 0.5;
  return (
    a.x + a.width > b.x + tolerance &&
    b.x + b.width > a.x + tolerance &&
    a.y + a.height > b.y + tolerance &&
    b.y + b.height > a.y + tolerance
  );
}

describe('invariants across component patterns', () => {
  for (const [name, html] of Object.entries(COMPONENTS)) {
    describe(name, () => {
      it('produces blocks inside the root and never overlapping', () => {
        const layout = measure(mountFull(html));
        expect(layout.blocks.length).toBeGreaterThan(0);
        for (const b of layout.blocks) {
          expect(b.x, `x of ${JSON.stringify(b)}`).toBeGreaterThanOrEqual(-0.01);
          expect(b.y, `y of ${JSON.stringify(b)}`).toBeGreaterThanOrEqual(-0.01);
          expect(b.x + b.width, `right of ${JSON.stringify(b)}`).toBeLessThanOrEqual(layout.width + 0.01);
          expect(b.y + b.height, `bottom of ${JSON.stringify(b)}`).toBeLessThanOrEqual(layout.height + 0.01);
          expect(b.width).toBeGreaterThan(0);
          expect(b.height).toBeGreaterThan(0);
        }
        for (let i = 0; i < layout.blocks.length; i++) {
          for (let j = i + 1; j < layout.blocks.length; j++) {
            expect(overlaps(layout.blocks[i]!, layout.blocks[j]!), `blocks ${i} and ${j} overlap`).toBe(
              false,
            );
          }
        }
      });

      it('is deterministic and JSON round-trippable', () => {
        const el = mountFull(html);
        const a = measure(el);
        const b = measure(el);
        expect(b).toEqual(a);
        expect(JSON.parse(JSON.stringify(a))).toEqual(a);
      });

      it('is sorted top to bottom, then left to right', () => {
        const layout = measure(mountFull(html));
        for (let i = 1; i < layout.blocks.length; i++) {
          const prev = layout.blocks[i - 1]!;
          const cur = layout.blocks[i]!;
          expect(cur.y > prev.y || (cur.y === prev.y && cur.x >= prev.x), `order at ${i}`).toBe(true);
        }
      });

      it('gives the same result for a visually hidden copy', () => {
        const visible = measure(mountFull(html));
        const hidden = measure(mountFull(html));
        const host = hidden && (document.body.lastElementChild as HTMLElement);
        host.style.visibility = 'hidden';
        expect(measure(host.firstElementChild!)).toEqual(visible);
      });
    });
  }
});

describe('component-specific expectations', () => {
  it('navbar: logo box, brand and links as text, sign-in as a control', () => {
    const layout = measure(mountFull(NAVBAR));
    const k = kinds(layout);
    expect(k['box']).toBe(1); // logo (burger is display:none on desktop)
    expect(k['control']).toBe(1);
    expect(k['text']).toBeGreaterThanOrEqual(5); // brand + 4 links
    // Everything sits on one row.
    const centers = layout.blocks.map((b) => b.y + b.height / 2);
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(20);
  });

  it('product grid: one media block, name, price and button per card', () => {
    const layout = measure(mountFull(PRODUCT_GRID(6)));
    const k = kinds(layout);
    expect(k['box']).toBe(6); // image placeholders (empty decorated divs)
    expect(k['control']).toBe(6);
    expect(k['text']).toBe(12);
    // Image placeholders keep their 4:3 aspect ratio.
    for (const b of layout.blocks.filter((x) => x.kind === 'box')) {
      expect(b.width / b.height).toBeCloseTo(4 / 3, 1);
      expect(b.radius).toBe('8px');
    }
  });

  it('form: every field is one control and labels are text', () => {
    const layout = measure(mountFull(FORM));
    const k = kinds(layout);
    // 2 text inputs, select, textarea, checkbox, submit
    expect(k['control']).toBe(6);
    expect(k['text']).toBeGreaterThanOrEqual(5);
    const controls = layout.blocks.filter((b) => b.kind === 'control');
    const textarea = controls.reduce((a, b) => (b.height > a.height ? b : a));
    expect(textarea.height).toBeGreaterThan(50);
    const checkbox = controls.reduce((a, b) => (b.width < a.width ? b : a));
    expect(checkbox.width).toBeLessThan(24);
  });

  it('pricing: svg icons are media, price is a tall text bar, CTA is a control', () => {
    const layout = measure(mountFull(PRICING));
    const k = kinds(layout);
    expect(k['media']).toBe(4);
    expect(k['control']).toBe(1);
    const text = layout.blocks.filter((b) => b.kind === 'text');
    const tallest = text.reduce((a, b) => (b.height > a.height ? b : a));
    const typical = text.filter((b) => b !== tallest).map((b) => b.height);
    expect(tallest.height).toBeGreaterThan(Math.max(...typical) * 1.8);
    for (const icon of layout.blocks.filter((b) => b.kind === 'media')) {
      expect(icon.width).toBeCloseTo(16, 0);
      expect(icon.height).toBeCloseTo(16, 0);
    }
  });

  it('comments: one round avatar per comment and body text that wraps', () => {
    const layout = measure(mountFull(COMMENTS(3)));
    const avatars = layout.blocks.filter((b) => b.kind === 'box');
    expect(avatars).toHaveLength(3);
    expect(avatars.every((a) => a.radius === '50%' && a.width === 36 && a.height === 36)).toBe(true);
    expect(kinds(layout)['text']).toBeGreaterThan(6);
    // All text sits to the right of the avatars.
    const avatarRight = Math.max(...avatars.map((a) => a.x + a.width));
    for (const t of layout.blocks.filter((b) => b.kind === 'text'))
      expect(t.x).toBeGreaterThanOrEqual(avatarRight);
  });

  it('chat: short bubbles are single pill blocks, a long bubble becomes text lines', () => {
    const layout = measure(mountFull(CHAT));
    const pills = layout.blocks.filter((b) => b.kind === 'box');
    expect(pills.length).toBe(3); // two short messages + the emoji bubble
    expect(pills.every((p) => p.radius === '16px')).toBe(true);
    expect(kinds(layout)['text']).toBeGreaterThanOrEqual(2); // the long bubble wrapped
    // Right-aligned "me" bubbles end at the right edge of the chat column.
    const chat = document.querySelector('.f-chat')!.getBoundingClientRect();
    const rightmost = Math.max(...pills.map((p) => p.x + p.width));
    expect(rightmost).toBeCloseTo(chat.width - 16, 0);
  });

  it('breadcrumb is one row of text; pagination is five square controls', () => {
    const layout = measure(mountFull(CRUMBS_AND_PAGER));
    const controls = layout.blocks.filter((b) => b.kind === 'control');
    expect(controls).toHaveLength(5);
    expect(controls.every((c) => c.width === 36 && c.height === 36 && c.radius === '6px')).toBe(true);
    const text = layout.blocks.filter((b) => b.kind === 'text');
    const ys = new Set(text.map((t) => Math.round(t.y)));
    expect(ys.size).toBe(1);
  });
});
