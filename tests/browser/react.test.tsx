import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createRef } from 'react';
import { AutoSkeleton, AutoSkeletonProvider, LayoutCache, type SkeletonLayout } from '../../src/react';
import { cleanup } from './fixtures';

afterEach(cleanup);

function Card({ name, bio }: { name: string; bio: string }) {
  return (
    <div style={{ width: 320, padding: 16, font: '16px/1.5 system-ui, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ccc', flex: 'none' }} />
        <strong>{name}</strong>
      </div>
      <p style={{ margin: '12px 0 0' }}>{bio}</p>
      <button style={{ marginTop: 12 }}>Follow</button>
    </div>
  );
}

const sample = {
  name: 'Sample Name',
  bio: 'A placeholder biography long enough to wrap onto a second line in the card.',
};
const real = {
  name: 'Ada Lovelace',
  bio: 'Mathematician and writer, chiefly known for her work on the Analytical Engine.',
};

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('<AutoSkeleton>', () => {
  it('renders a measured skeleton while loading and hides the content', async () => {
    const screen = await render(
      <AutoSkeleton loading>
        <Card {...sample} />
      </AutoSkeleton>,
    );
    const status = screen.container.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.getAttribute('aria-label')).toBe('Loading');
    expect(status.querySelectorAll('.auto-skeleton__block').length).toBeGreaterThanOrEqual(4);
    expect(status.querySelector('.auto-skeleton__block--control')).not.toBeNull();
    expect((status as HTMLElement).style.height).not.toBe('0px');

    // Once measured, the hidden measurement copy is unmounted: the DOM holds
    // nothing but the skeleton while loading.
    expect(screen.container.querySelector('[style*="clip-path"]')).toBeNull();
    expect(screen.container.querySelectorAll('button')).toHaveLength(0);
    expect(document.getElementById('auto-skeleton-styles')).not.toBeNull();
  });

  it('measures from an inert, clipped copy of the source', async () => {
    let root: HTMLElement | null = null;
    await render(
      <AutoSkeleton
        loading
        classify={(el) => {
          root ??= el.closest('[style*="clip-path"]');
          return undefined;
        }}
      >
        <Card {...sample} />
      </AutoSkeleton>,
    );
    expect(root).not.toBeNull();
    expect(root!.inert).toBe(true);
    expect(root!.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses the placeholder for measurement when children cannot render', async () => {
    const Boom = () => {
      throw new Error('should not render while loading');
    };
    const screen = await render(
      <AutoSkeleton loading placeholder={<Card {...sample} />}>
        <Boom />
      </AutoSkeleton>,
    );
    expect(screen.container.querySelectorAll('.auto-skeleton__block').length).toBeGreaterThan(0);
  });

  it('swaps to the real content with a cross-fade', async () => {
    function App() {
      const [loading, setLoading] = useState(true);
      return (
        <>
          <button data-testid="done" onClick={() => setLoading(false)}>
            done
          </button>
          <AutoSkeleton loading={loading} fadeDuration={60} placeholder={<Card {...sample} />}>
            <Card {...real} />
          </AutoSkeleton>
        </>
      );
    }
    const screen = await render(<App />);
    expect(screen.container.textContent).not.toContain('Ada Lovelace');

    await screen.getByTestId('done').click();

    const wrapper = screen.container.querySelector('[data-auto-skeleton-state]')!;
    expect(wrapper.getAttribute('data-auto-skeleton-state')).toBe('fading');
    expect(screen.container.textContent).toContain('Ada Lovelace');
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.classList.contains('auto-skeleton--fading')).toBe(true);
    expect(status.getAttribute('aria-busy')).toBe('false');
    expect(getComputedStyle(status).position).toBe('absolute');

    await vi.waitFor(() => expect(wrapper.getAttribute('data-auto-skeleton-state')).toBe('idle'), {
      timeout: 1000,
    });
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
  });

  it('skips the fade when fadeDuration is 0', async () => {
    const screen = await render(
      <AutoSkeleton loading fadeDuration={0}>
        <Card {...sample} />
      </AutoSkeleton>,
    );
    await screen.rerender(
      <AutoSkeleton loading={false} fadeDuration={0}>
        <Card {...sample} />
      </AutoSkeleton>,
    );
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
    expect(
      screen.container.querySelector('[data-auto-skeleton-state]')!.getAttribute('data-auto-skeleton-state'),
    ).toBe('idle');
  });

  it('re-measures when the container resizes', async () => {
    const layouts: SkeletonLayout[] = [];
    const screen = await render(
      <div style={{ width: 400 }} data-testid="outer">
        <AutoSkeleton loading onLayout={(l) => layouts.push(l)}>
          <div style={{ font: '16px/24px sans-serif' }}>
            <p style={{ margin: 0 }}>
              {sample.bio} {sample.bio} {sample.bio}
            </p>
          </div>
        </AutoSkeleton>
      </div>,
    );
    expect(layouts).toHaveLength(1);
    expect(layouts[0]!.width).toBe(400);

    (screen.container.querySelector('[data-testid="outer"]') as HTMLElement).style.width = '200px';
    await vi.waitFor(() => expect(layouts.length).toBe(2), { timeout: 1000 });
    await nextFrame();
    expect(layouts[1]!.width).toBe(200);
    expect(layouts[1]!.blocks.length).toBeGreaterThan(layouts[0]!.blocks.length);
    expect((screen.container.querySelector('[role="status"]') as HTMLElement).style.height).toBe(
      `${layouts[1]!.height}px`,
    );
  });

  it('reuses a cached layout instead of measuring', async () => {
    const cache = new LayoutCache();
    const first = await render(
      <AutoSkeleton loading cacheKey="card" cache={cache}>
        <Card {...sample} />
      </AutoSkeleton>,
    );
    const blocks = first.container.querySelectorAll('.auto-skeleton__block').length;
    expect(blocks).toBeGreaterThan(0);
    expect(cache.size).toBe(1);
    await first.unmount();

    // No source at all this time: the layout must come from the cache.
    const second = await render(
      <AutoSkeleton loading cacheKey="card" cache={cache} placeholder={null}>
        <Card {...real} />
      </AutoSkeleton>,
    );
    expect(second.container.querySelectorAll('.auto-skeleton__block')).toHaveLength(blocks);
    expect(second.container.querySelectorAll('button')).toHaveLength(0);
  });

  it('honours minHeight when nothing can be measured', async () => {
    const screen = await render(
      <AutoSkeleton loading placeholder={null} minHeight={120}>
        <Card {...real} />
      </AutoSkeleton>,
    );
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.height).toBe('120px');
    expect(status.querySelectorAll('.auto-skeleton__block')).toHaveLength(0);
  });

  it('forwards presentation props', async () => {
    const screen = await render(
      <AutoSkeleton
        loading
        as="section"
        className="wrap"
        style={{ margin: 4 }}
        skeletonClassName="sk"
        animate={false}
        label="Loading profile"
        injectStyles={false}
      >
        <Card {...sample} />
      </AutoSkeleton>,
    );
    const wrapper = screen.container.querySelector('section.wrap') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.style.margin).toBe('4px');
    expect(wrapper.style.position).toBe('relative');
    const status = wrapper.querySelector('[role="status"]')!;
    expect(status.className).toBe('auto-skeleton sk');
    expect(status.getAttribute('data-animate')).toBe('false');
    expect(status.getAttribute('aria-label')).toBe('Loading profile');
    expect(document.getElementById('auto-skeleton-styles')).toBeNull();
  });

  it('passes measure options through', async () => {
    const layouts: SkeletonLayout[] = [];
    await render(
      <AutoSkeleton loading textScale={1} textRadius="0px" onLayout={(l) => layouts.push(l)}>
        <p style={{ margin: 0, font: '16px/24px sans-serif' }}>one line</p>
      </AutoSkeleton>,
    );
    expect(layouts[0]!.blocks).toHaveLength(1);
    expect(layouts[0]!.blocks[0]!.radius).toBe('0px');
    expect(layouts[0]!.blocks[0]!.height).toBeGreaterThan(14);
  });

  it('does nothing when never loading', async () => {
    const screen = await render(
      <AutoSkeleton loading={false}>
        <Card {...real} />
      </AutoSkeleton>,
    );
    expect(screen.container.querySelector('[role="status"]')).toBeNull();
    expect(screen.container.textContent).toContain('Ada Lovelace');
    expect(document.getElementById('auto-skeleton-styles')).toBeNull();
    await sleep(10);
  });

  it('applies theme props as custom properties', async () => {
    const screen = await render(
      <AutoSkeleton loading color="rgb(10, 20, 30)" highlight="rgb(200, 200, 200)" duration={900} fade="1s">
        <Card {...sample} />
      </AutoSkeleton>,
    );
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.getPropertyValue('--auto-skeleton-duration')).toBe('900ms');
    expect(status.style.getPropertyValue('--auto-skeleton-fade')).toBe('1s');
    const block = status.querySelector('.auto-skeleton__block')!;
    expect(getComputedStyle(block).backgroundColor).toBe('rgb(10, 20, 30)');
    expect(getComputedStyle(block, '::after').backgroundImage).toContain('rgb(200, 200, 200)');
  });

  it('takes defaults from the provider and lets props override them', async () => {
    const screen = await render(
      <AutoSkeletonProvider color="rgb(1, 1, 1)" animate={false} label="Please wait" textRadius="0px">
        <AutoSkeleton loading>
          <Card {...sample} />
        </AutoSkeleton>
        <AutoSkeleton loading color="rgb(2, 2, 2)" label="Second">
          <Card {...sample} />
        </AutoSkeleton>
      </AutoSkeletonProvider>,
    );
    const [first, second] = Array.from(screen.container.querySelectorAll('[role="status"]'));
    expect(first!.getAttribute('aria-label')).toBe('Please wait');
    expect(first!.getAttribute('data-animate')).toBe('false');
    expect(getComputedStyle(first!.querySelector('.auto-skeleton__block')!).backgroundColor).toBe(
      'rgb(1, 1, 1)',
    );
    expect((first!.querySelector('.auto-skeleton__block--text') as HTMLElement).style.borderRadius).toBe(
      '0px',
    );
    expect(second!.getAttribute('aria-label')).toBe('Second');
    expect(second!.getAttribute('data-animate')).toBe('false');
    expect(getComputedStyle(second!.querySelector('.auto-skeleton__block')!).backgroundColor).toBe(
      'rgb(2, 2, 2)',
    );
  });

  it('renders a layout prop without measuring anything', async () => {
    const layouts: SkeletonLayout[] = [];
    const layout: SkeletonLayout = {
      width: 320,
      height: 64,
      blocks: [{ x: 0, y: 0, width: 64, height: 64, radius: '8px', kind: 'media' }],
    };
    const Boom = () => {
      throw new Error('must not render');
    };
    const screen = await render(
      <AutoSkeleton loading layout={layout} onLayout={(l) => layouts.push(l)}>
        <Boom />
      </AutoSkeleton>,
    );
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.height).toBe('64px');
    expect(status.querySelectorAll('.auto-skeleton__block')).toHaveLength(1);
    expect(screen.container.querySelector('[style*="clip-path"]')).toBeNull();
    expect(layouts).toEqual([layout]);
  });

  it('paints provider layouts on the first frame and re-measures only if the width differs', async () => {
    const provided: SkeletonLayout = {
      width: 320,
      height: 40,
      blocks: [{ x: 0, y: 0, width: 320, height: 40, radius: '0px', kind: 'box' }],
    };
    const layouts: SkeletonLayout[] = [];
    // Matching width: provided layout is used as-is, the source never mounts.
    const a = await render(
      <div style={{ width: 320 }}>
        <AutoSkeletonProvider layouts={{ card: provided }}>
          <AutoSkeleton loading cacheKey="card" cache={new LayoutCache()} onLayout={(l) => layouts.push(l)}>
            <Card {...sample} />
          </AutoSkeleton>
        </AutoSkeletonProvider>
      </div>,
    );
    expect(layouts).toEqual([provided]);
    expect(a.container.querySelectorAll('button')).toHaveLength(0);
    await a.unmount();

    // Different width: the source mounts and a fresh layout replaces it.
    const b = await render(
      <div style={{ width: 400 }}>
        <AutoSkeletonProvider layouts={{ card: provided }}>
          <AutoSkeleton loading cacheKey="card" cache={new LayoutCache()} onLayout={(l) => layouts.push(l)}>
            <Card {...sample} />
          </AutoSkeleton>
        </AutoSkeletonProvider>
      </div>,
    );
    await vi.waitFor(() => expect(layouts).toHaveLength(2));
    expect(layouts[1]!.width).toBe(400);
    expect(layouts[1]!.blocks.length).toBeGreaterThan(1);
    expect((b.container.querySelector('[role="status"]') as HTMLElement).style.height).toBe(
      `${layouts[1]!.height}px`,
    );
  });

  it('uses the freshest cached layout for a key on the first frame, then corrects for width', async () => {
    const cache = new LayoutCache();
    const first = await render(
      <div style={{ width: 320 }}>
        <AutoSkeleton loading cacheKey="k" cache={cache}>
          <Card {...sample} />
        </AutoSkeleton>
      </div>,
    );
    const at320 = cache.latest('k')!;
    await first.unmount();

    const layouts: SkeletonLayout[] = [];
    const second = await render(
      <div style={{ width: 260 }}>
        <AutoSkeleton loading cacheKey="k" cache={cache} onLayout={(l) => layouts.push(l)}>
          <Card {...sample} />
        </AutoSkeleton>
      </div>,
    );
    await vi.waitFor(() => expect(layouts).toHaveLength(1));
    expect(layouts[0]!.width).toBe(260);
    expect(layouts[0]).not.toBe(at320);
    expect(cache.size).toBe(2);
    expect(second.container.querySelectorAll('button')).toHaveLength(0);
  });

  it('reports measurement errors and falls back to minHeight', async () => {
    const errors: unknown[] = [];
    const screen = await render(
      <AutoSkeleton
        loading
        minHeight={48}
        onError={(e) => errors.push(e)}
        classify={() => {
          throw new Error('boom');
        }}
      >
        <Card {...sample} />
      </AutoSkeleton>,
    );
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
    const status = screen.container.querySelector('[role="status"]') as HTMLElement;
    expect(status.style.height).toBe('48px');
    expect(status.querySelectorAll('.auto-skeleton__block')).toHaveLength(0);
  });

  it('forwards a ref to the wrapper element', async () => {
    const ref = createRef<HTMLElement>();
    await render(
      <AutoSkeleton loading ref={ref} as="section">
        <Card {...sample} />
      </AutoSkeleton>,
    );
    expect(ref.current?.tagName).toBe('SECTION');
    expect(ref.current?.getAttribute('data-auto-skeleton-state')).toBe('loading');
  });

  it('honours maxBlocks from the provider on large content', async () => {
    const screen = await render(
      <AutoSkeletonProvider maxBlocks={30}>
        <AutoSkeleton loading>
          <ul style={{ font: '14px/20px sans-serif', margin: 0, padding: 0, listStyle: 'none' }}>
            {Array.from({ length: 200 }, (_, i) => (
              <li key={i}>Item number {i}</li>
            ))}
          </ul>
        </AutoSkeleton>
      </AutoSkeletonProvider>,
    );
    expect(screen.container.querySelectorAll('.auto-skeleton__block').length).toBeLessThanOrEqual(30);
  });
});
