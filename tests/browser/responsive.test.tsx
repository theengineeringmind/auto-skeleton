/**
 * Responsive behaviour: the viewport is resized for real, so media queries,
 * container queries and fluid type all take effect, and the React component
 * must follow.
 */
import { page } from 'vitest/browser';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { measure, type SkeletonLayout } from '../../src';
import { AutoSkeleton, AutoSkeletonProvider, LayoutCache } from '../../src/react';
import {
  ARTICLE,
  NAVBAR,
  PRODUCT_GRID,
  STATS,
  cleanupAll,
  installFixtureStyles,
  mountFull,
} from './fixtures/components';

const VIEWPORTS = {
  phoneSmall: 320,
  phone: 375,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
} as const;

async function setViewport(width: number): Promise<void> {
  await page.viewport(width, 900);
  // Let layout settle after the resize.
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

beforeAll(installFixtureStyles);
afterEach(cleanupAll);
afterAll(async () => {
  await page.viewport(1280, 720);
});

function columnsOf(layout: SkeletonLayout, kind: string): number {
  const xs = new Set(layout.blocks.filter((b) => b.kind === kind).map((b) => Math.round(b.x)));
  return xs.size;
}

describe('media queries', () => {
  it('product grid reflows from 1 to 2 to 3 columns', async () => {
    const expected: Record<keyof typeof VIEWPORTS, number> = {
      phoneSmall: 1,
      phone: 1,
      tablet: 2,
      laptop: 3,
      desktop: 3,
    };
    for (const [name, width] of Object.entries(VIEWPORTS) as [keyof typeof VIEWPORTS, number][]) {
      await setViewport(width);
      const layout = measure(mountFull(PRODUCT_GRID(6)));
      expect(columnsOf(layout, 'box'), `${name} (${width}px)`).toBe(expected[name]);
      expect(layout.width).toBe(width);
      cleanupAll();
    }
  });

  it('navbar collapses links into a menu button on phones', async () => {
    await setViewport(VIEWPORTS.phone);
    const mobile = measure(mountFull(NAVBAR));
    const mobileKinds = mobile.blocks.map((b) => b.kind);
    expect(mobileKinds.filter((k) => k === 'box')).toHaveLength(2); // logo + burger
    expect(mobileKinds.filter((k) => k === 'text')).toHaveLength(1); // brand only
    expect(mobileKinds).not.toContain('control');
    cleanupAll();

    await setViewport(VIEWPORTS.laptop);
    const desktop = measure(mountFull(NAVBAR));
    const desktopKinds = desktop.blocks.map((b) => b.kind);
    expect(desktopKinds.filter((k) => k === 'box')).toHaveLength(1);
    expect(desktopKinds.filter((k) => k === 'text').length).toBeGreaterThanOrEqual(5);
    expect(desktopKinds).toContain('control');
  });

  it('article text wraps into more lines on narrower screens and the fluid heading shrinks', async () => {
    await setViewport(VIEWPORTS.desktop);
    const wide = measure(mountFull(ARTICLE));
    cleanupAll();
    await setViewport(VIEWPORTS.phoneSmall);
    const narrow = measure(mountFull(ARTICLE));

    expect(narrow.blocks.length).toBeGreaterThan(wide.blocks.length * 1.5);
    expect(narrow.height).toBeGreaterThan(wide.height);

    const heading = (l: SkeletonLayout) => l.blocks[0]!;
    expect(heading(narrow).height).toBeLessThan(heading(wide).height);
    // Every line stays inside the article column at both sizes.
    for (const l of [wide, narrow])
      for (const b of l.blocks) expect(b.x + b.width).toBeLessThanOrEqual(l.width + 0.01);
  });
});

describe('container queries', () => {
  it('stat tiles depend on the container width, not the viewport', async () => {
    await setViewport(VIEWPORTS.desktop);
    const narrowHost = measure(mountFull(STATS, '400px'));
    expect(columnsOf(narrowHost, 'text')).toBe(1);
    cleanupAll();
    const wideHost = measure(mountFull(STATS, '900px'));
    expect(columnsOf(wideHost, 'text')).toBe(4);
    expect(wideHost.height).toBeLessThan(narrowHost.height / 2);
  });
});

describe('<AutoSkeleton> under viewport changes', () => {
  const Grid = () => <div dangerouslySetInnerHTML={{ __html: PRODUCT_GRID(4) }} />;

  it('re-measures when the viewport changes and reuses the cache when it changes back', async () => {
    await setViewport(VIEWPORTS.desktop);
    const layouts: SkeletonLayout[] = [];
    const cache = new LayoutCache();
    const screen = await render(
      <AutoSkeleton loading cacheKey="grid" cache={cache} onLayout={(l) => layouts.push(l)}>
        <Grid />
      </AutoSkeleton>,
    );
    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.width).toBe(VIEWPORTS.desktop);
    expect(columnsOf(layouts[0]!, 'box')).toBe(3);

    await setViewport(VIEWPORTS.phone);
    await vi.waitFor(() => expect(layouts).toHaveLength(2), { timeout: 2000 });
    expect(layouts[1]!.width).toBe(VIEWPORTS.phone);
    expect(columnsOf(layouts[1]!, 'box')).toBe(1);
    expect(cache.size).toBe(2);

    // Back to desktop: the cached layout is reused, not re-measured.
    await setViewport(VIEWPORTS.desktop);
    await vi.waitFor(() => expect(layouts).toHaveLength(3), { timeout: 2000 });
    expect(layouts[2]).toBe(layouts[0]);
    expect(cache.size).toBe(2);
    expect(screen.container.querySelector('[style*="clip-path"]')).toBeNull();

    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.height).toBe(`${layouts[0]!.height}px`);
  });

  it('uses a provider layout made for one width and corrects itself at another', async () => {
    await setViewport(VIEWPORTS.desktop);
    const desktopLayout = measure(mountFull(PRODUCT_GRID(4)));
    cleanupAll();

    await setViewport(VIEWPORTS.tablet);
    const layouts: SkeletonLayout[] = [];
    const screen = await render(
      <AutoSkeletonProvider layouts={{ grid: desktopLayout }} cache={new LayoutCache()}>
        <AutoSkeleton loading cacheKey="grid" onLayout={(l) => layouts.push(l)}>
          <Grid />
        </AutoSkeleton>
      </AutoSkeletonProvider>,
    );
    await vi.waitFor(() => expect(layouts).toHaveLength(1), { timeout: 2000 });
    expect(layouts[0]!.width).toBe(VIEWPORTS.tablet);
    expect(columnsOf(layouts[0]!, 'box')).toBe(2);
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.height).toBe(`${layouts[0]!.height}px`);
  });

  it('keeps the skeleton within the wrapper on every viewport', async () => {
    for (const width of Object.values(VIEWPORTS)) {
      await setViewport(width);
      const screen = await render(
        <AutoSkeleton loading>
          <div dangerouslySetInnerHTML={{ __html: NAVBAR + PRODUCT_GRID(3) + ARTICLE }} />
        </AutoSkeleton>,
      );
      const status = screen.container.querySelector('[role="status"]') as HTMLElement;
      const bounds = status.getBoundingClientRect();
      expect(bounds.width).toBe(width);
      for (const block of Array.from(status.children)) {
        const r = block.getBoundingClientRect();
        expect(r.right, `block right at ${width}px`).toBeLessThanOrEqual(bounds.right + 0.5);
        expect(r.bottom, `block bottom at ${width}px`).toBeLessThanOrEqual(bounds.bottom + 0.5);
      }
      await screen.unmount();
      cleanupAll();
    }
  });
});
