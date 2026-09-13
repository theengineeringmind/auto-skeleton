// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AutoSkeleton, AutoSkeletonProvider, type SkeletonLayout } from '../../src/react';

const layout: SkeletonLayout = {
  width: 320,
  height: 100,
  blocks: [
    { x: 0, y: 0, width: 40, height: 40, radius: '50%', kind: 'box' },
    { x: 52, y: 8, width: 120, height: 12, radius: '4px', kind: 'text' },
  ],
};

describe('AutoSkeleton on the server', () => {
  it('renders a placeholder region while loading without touching the DOM', () => {
    const html = renderToString(
      <AutoSkeleton loading minHeight={80}>
        <p>Content</p>
      </AutoSkeleton>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('height:80px');
    expect(html).toContain('data-auto-skeleton-state="loading"');
    // The source is rendered (hidden) so hydration can measure it.
    expect(html).toContain('<p>Content</p>');
  });

  it('renders real blocks on the server from a layout prop', () => {
    const html = renderToString(
      <AutoSkeleton loading layout={layout} color="#ddd">
        <p>Content</p>
      </AutoSkeleton>,
    );
    expect(html.match(/auto-skeleton__block/g)).toHaveLength(2 * 2); // class + modifier per block
    expect(html).toContain('height:100px');
    expect(html).toContain('--auto-skeleton-color:#ddd');
    expect(html).toContain('border-radius:50%');
    // No measurement source is shipped when a layout is known.
    expect(html).not.toContain('<p>Content</p>');
  });

  it('renders real blocks on the server from provider layouts keyed by cacheKey', () => {
    const html = renderToString(
      <AutoSkeletonProvider layouts={{ card: layout }} highlight="white">
        <AutoSkeleton loading cacheKey="card">
          <p>Content</p>
        </AutoSkeleton>
      </AutoSkeletonProvider>,
    );
    expect(html).toContain('auto-skeleton__block--text');
    expect(html).toContain('--auto-skeleton-highlight:white');
    expect(html).not.toContain('<p>Content</p>');
  });

  it('renders only the children when not loading', () => {
    const html = renderToString(
      <AutoSkeleton loading={false}>
        <p>Content</p>
      </AutoSkeleton>,
    );
    expect(html).toContain('<p>Content</p>');
    expect(html).not.toContain('role="status"');
  });
});
