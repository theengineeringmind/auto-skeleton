# auto-skeleton

**Automatic skeleton loading screens for React and vanilla JavaScript.** auto-skeleton measures your real component and generates a pixel-accurate skeleton loader with shimmer. No hand-written skeleton components, no drift when your design changes, server-side rendering and Next.js ready, under 3 kB.

[![npm version](https://img.shields.io/npm/v/auto-skeleton?color=3b82f6)](https://www.npmjs.com/package/auto-skeleton)
[![npm downloads](https://img.shields.io/npm/dm/auto-skeleton)](https://www.npmjs.com/package/auto-skeleton)
[![bundle size](https://img.shields.io/bundlephobia/minzip/auto-skeleton?label=core%20size)](https://bundlephobia.com/package/auto-skeleton)
[![CI](https://github.com/theengineeringmind/auto-skeleton/actions/workflows/ci.yml/badge.svg)](https://github.com/theengineeringmind/auto-skeleton/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/auto-skeleton)](https://www.npmjs.com/package/auto-skeleton)
[![license](https://img.shields.io/npm/l/auto-skeleton)](./LICENSE)

![A profile card next to the skeleton loader auto-skeleton generated from it](https://raw.githubusercontent.com/theengineeringmind/auto-skeleton/main/docs/hero.png)

```tsx
import { AutoSkeleton } from 'auto-skeleton/react';

<AutoSkeleton loading={isLoading}>
  <ProfileCard user={user} />
</AutoSkeleton>;
```

That is the whole integration. Text lines, avatars, images, buttons, badges and chips are detected from the rendered DOM and turned into shimmer blocks in exactly the right place.

## Why auto-skeleton

- **Zero skeleton components to write or maintain.** Every other skeleton library makes you compose grey boxes by hand. auto-skeleton measures the real thing.
- **Never drifts.** Change a font size, padding or layout and the skeleton follows, because it is measured, not drawn.
- **Server-side rendering and React Server Components.** Ship precomputed layouts and the server renders real blocks with zero layout shift. The React entry is a `'use client'` boundary.
- **No measurable runtime cost.** One measurement per component per width, cached across mounts. The shimmer is a compositor-only transform. Core is 3 kB brotlied, React entry 4 kB.
- **Framework agnostic.** A plain DOM core with a React wrapper today. Use the core from Vue, Svelte, Angular, Web Components or plain JavaScript.
- **Accessible by default.** `role="status"`, `aria-busy`, a screen-reader label, and `prefers-reduced-motion` support.
- **Enterprise details handled.** App-wide provider, theme props, CSP nonce, error fallback, block cap, correct types for CommonJS and ESM.

## Install

```bash
npm install auto-skeleton
```

```bash
pnpm add auto-skeleton
```

```bash
yarn add auto-skeleton
```

React 18 or 19 is an optional peer dependency, only needed for `auto-skeleton/react`.

## Quick start with React

```tsx
import { AutoSkeleton, AutoSkeletonProvider } from 'auto-skeleton/react';

// Once, near the root of the app. Every prop is optional.
export function App() {
  return (
    <AutoSkeletonProvider color="rgba(120, 120, 120, 0.2)" highlight="rgba(120, 120, 120, 0.4)">
      <Routes />
    </AutoSkeletonProvider>
  );
}

// Anywhere below. Works with TanStack Query, SWR, RTK Query, Apollo, fetch, anything with a loading flag.
function Profile({ userId }) {
  const { data, isLoading } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  return (
    <AutoSkeleton loading={isLoading} cacheKey="profile" placeholder={<ProfileCard user={sampleUser} />}>
      <ProfileCard user={data} />
    </AutoSkeleton>
  );
}
```

While `loading` is true the component paints the best layout it already knows (a `layout` prop, a provider layout, or a cached one). If none exists for the current width it mounts the measurement source (the `placeholder` if given, otherwise `children`) into a hidden inert layer, measures it once, unmounts it, and stores the result. When `loading` flips to false the real children render and the skeleton fades out on top of them.

### With React Suspense

```tsx
<Suspense
  fallback={<AutoSkeleton loading placeholder={<ProfileCard user={sampleUser} />} cacheKey="profile" />}
>
  <Profile userId={id} />
</Suspense>
```

### With Next.js App Router

`auto-skeleton/react` is a client component boundary, so it can be imported directly from a Server Component. Use it in `loading.tsx` or around any client data fetch:

```tsx
// app/profile/[id]/loading.tsx
import { AutoSkeleton } from 'auto-skeleton/react';
import { ProfileCard } from '@/components/profile-card';
import layouts from '@/skeleton-layouts.json';

export default function Loading() {
  return <AutoSkeleton loading layout={layouts.profile} />;
}
```

With a `layout` the server renders the actual blocks, so the skeleton is in the HTML stream and there is no client measurement at all. See [Server rendering](#server-rendering) for how to generate layouts.

## Quick start with vanilla JavaScript

```ts
import { createSkeleton, measure, renderSkeleton } from 'auto-skeleton';

const handle = createSkeleton(document.querySelector('.card'), { color: '#e5e7eb', highlight: '#f3f4f6' });
container.replaceChildren(handle.element);
handle.update(); // re-measure after a resize
handle.destroy();

// Or separately. Layouts are plain JSON, so you can precompute and ship them.
const layout = measure(element);
const el = renderSkeleton(layout, { animate: false });
```

`measure()` needs a laid-out element attached to the document. It may be hidden with `visibility: hidden` or `clip-path`, but not `display: none`.

## How it compares

|                                       | auto-skeleton                                            | react-loading-skeleton                              | react-content-loader            | MUI / Chakra Skeleton                                      |
| ------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| How the skeleton is defined           | Measured from your real component                        | You place `<Skeleton count={3} />` per line by hand | You draw SVG rectangles by hand | You compose `variant="text"` / `"circular"` blocks by hand |
| Matches the real layout               | Pixel-accurate, including wrapped lines and border radii | Approximate                                         | As accurate as your drawing     | Approximate                                                |
| Stays in sync when the design changes | Yes, automatically                                       | No, edit the skeleton                               | No, redraw                      | No, edit the skeleton                                      |
| Server-rendered blocks                | Yes, from precomputed layouts                            | Yes                                                 | Yes                             | Yes                                                        |
| Framework support                     | Any (DOM core) + React                                   | React                                               | React, Vue, Svelte, Angular     | React                                                      |
| Size (brotli)                         | 3 kB core, 4 kB React                                    | ~2 kB                                               | ~2 kB                           | Part of the UI kit                                         |

Those libraries are good at what they do. auto-skeleton exists because the hand-composition step is the part that goes stale, and it is the part you no longer do.

## Component props

| Prop                 | Type                               | Default    | Description                                                                                                                      |
| -------------------- | ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `loading`            | `boolean`                          | required   | Show the skeleton instead of `children`.                                                                                         |
| `placeholder`        | `ReactNode`                        | `children` | What to measure. Pass a version rendered with sample data if `children` cannot render without data. `null` disables measurement. |
| `layout`             | `SkeletonLayout`                   |            | A precomputed layout. Rendered as-is on server and client, never measured.                                                       |
| `cacheKey`           | `string`                           |            | Reuse layouts across mounts and loading cycles, and look up provider `layouts`. Keyed by name and container width.               |
| `minHeight`          | `number \| string`                 | `0`        | Height before the first measurement and during SSR without a layout.                                                             |
| `as`                 | `ElementType`                      | `'div'`    | Wrapper element. A `ref` is forwarded to it.                                                                                     |
| `className`, `style` |                                    |            | Applied to the wrapper.                                                                                                          |
| `skeletonClassName`  | `string`                           |            | Extra classes on the skeleton container.                                                                                         |
| `onLayout`           | `(layout: SkeletonLayout) => void` |            | Called once per distinct layout used.                                                                                            |

Every [configuration option](#configuration) below is also accepted as a prop and overrides the provider.

## Configuration

Set once on `<AutoSkeletonProvider>` or per component. Providers nest and merge.

| Option               | Type                                                  | Default                     | Description                                                                                                                             |
| -------------------- | ----------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `color`              | `string`                                              | `rgba(128, 128, 128, 0.18)` | Block colour. Any CSS colour, so it can be a token like `var(--surface-muted)`.                                                         |
| `highlight`          | `string`                                              | `rgba(128, 128, 128, 0.34)` | Shimmer highlight colour.                                                                                                               |
| `duration`           | `number \| string`                                    | `1600`                      | One shimmer sweep, in ms or a CSS time.                                                                                                 |
| `fade`               | `number \| string`                                    | `200`                       | CSS fade-out duration when content arrives.                                                                                             |
| `fadeDuration`       | `number`                                              | `200`                       | How long the fading skeleton stays mounted, in ms. Keep equal to `fade`. `0` disables the fade.                                         |
| `animate`            | `boolean`                                             | `true`                      | Shimmer on or off. Reduced-motion users never see it either way.                                                                        |
| `label`              | `string`                                              | `'Loading'`                 | Accessible label announced by screen readers.                                                                                           |
| `injectStyles`       | `boolean`                                             | `true`                      | Inject the default stylesheet. Set `false` and include `autoskeletonCSS` yourself under strict CSP.                                     |
| `nonce`              | `string`                                              |                             | CSP nonce for the injected `<style>`.                                                                                                   |
| `cache`              | `LayoutCache`                                         | shared                      | Cache instance. Use one per micro-frontend if they must not share.                                                                      |
| `layouts`            | `Record<string, SkeletonLayout>`                      |                             | Precomputed layouts by `cacheKey`. See [Server rendering](#server-rendering).                                                           |
| `onError`            | `(error: unknown) => void`                            |                             | Measurement threw. The component shows `minHeight` and the app keeps running.                                                           |
| `textScale`          | `number`                                              | `0.7`                       | Vertical scale of each text line box. Produces the thin-bar look.                                                                       |
| `minSize`            | `number`                                              | `2`                         | Blocks smaller than this in either dimension are dropped.                                                                               |
| `maxBackgroundBlock` | `number`                                              | `64`                        | Size threshold for treating decorated elements as one block: avatars, icons, badges, chips. Empty decorated elements are always blocks. |
| `mergeGap`           | `number`                                              | `4`                         | Text fragments on the same line closer than this merge into one bar.                                                                    |
| `textRadius`         | `string`                                              | `'4px'`                     | Border radius for text bars. Other blocks copy the source element's radius.                                                             |
| `maxBlocks`          | `number`                                              | `400`                       | Hard cap on blocks. Measurement stops early once reached.                                                                               |
| `classify`           | `(el) => 'skip' \| 'block' \| 'descend' \| undefined` |                             | Override the built-in rules per element.                                                                                                |

### Controlling what gets measured

Add `data-auto-skeleton` to any element:

```html
<div data-auto-skeleton="skip">not part of the skeleton</div>
<div data-auto-skeleton="block">painted as one rectangle</div>
<img data-auto-skeleton="descend" />
```

Built-in rules, in order: your `classify` callback, the data attribute, hidden elements are skipped, media and form controls are blocks, decorated elements that are small, text-only and short, or empty are blocks, everything else is descended into and its text is measured line by line.

## Server rendering

`<AutoSkeleton>` is safe to render on the server in any mode. Three levels, from simplest to best:

1. **Nothing extra.** The server renders a status region of `minHeight`; the client measures after hydration. Give `minHeight` a sensible value to avoid layout shift.
2. **A `layout` prop.** The server renders real blocks. No measurement ever runs on the client.
3. **Provider `layouts`.** Generate layouts once in CI and pass them to the provider. Every component with a matching `cacheKey` renders real blocks on the server and paints them on the first client frame. If the container width differs at runtime the component re-measures once and caches the result.

Generating layouts is a few lines of Playwright against your Storybook or a route that renders the components with sample data:

```ts
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:6006/iframe.html?id=profile-card--default');
const layouts = await page.evaluate(async () => {
  const { measure } = await import('auto-skeleton');
  return { profile: measure(document.querySelector('.profile-card')) };
});
await fs.writeFile('src/skeleton-layouts.json', JSON.stringify(layouts));
```

Layouts are plain JSON: `{ width, height, blocks: [{ x, y, width, height, radius, kind }] }`.

## Performance

- **Measurement is one read pass.** Each element is classified with one `getComputedStyle` call and text is measured with `Range.getClientRects()`. No writes are interleaved, so there is no layout thrash.
- **It runs once per component per width.** Results are cached by `cacheKey` and width. A cached or provided layout is painted on the first frame and the measurement source is never mounted.
- **The source is unmounted after measuring.** While loading, the DOM holds only the skeleton blocks.
- **The shimmer is a compositor transform.** Each block has one pseudo-element animating `translateX`, offset so all blocks show a single coherent sweep. No style recalculation or layout runs per frame. The container uses `contain: layout style paint`.
- **Bounded output.** `maxBlocks` stops measurement early, so a giant table produces at most 400 blocks by default.
- **Resize is debounced** to one measurement per animation frame.

## Styling and dark mode

Props set CSS custom properties on the container, and the same variables can be set on any ancestor for theming. The defaults are translucent greys that work on light and dark backgrounds without configuration.

```css
:root {
  --auto-skeleton-color: rgba(128, 128, 128, 0.18);
  --auto-skeleton-highlight: rgba(128, 128, 128, 0.34);
  --auto-skeleton-duration: 1.6s;
  --auto-skeleton-fade: 200ms;
}
```

Blocks carry `.auto-skeleton__block--text`, `--media`, `--control` and `--box` for finer styling. Works alongside Tailwind CSS, shadcn/ui, CSS Modules, styled-components or any other styling approach, since it never touches your component's styles. The default stylesheet is exported as `autoskeletonCSS` if you would rather ship it in your own bundle.

## Accessibility

The skeleton container has `role="status"`, `aria-busy="true"` and an `aria-label` (default "Loading"), so screen readers announce the loading state once and ignore the individual blocks. The hidden measurement layer is `inert` and `aria-hidden`. The shimmer is disabled under `prefers-reduced-motion: reduce`.

## FAQ

### How do I add a skeleton loader to a React component?

Wrap it: `<AutoSkeleton loading={isLoading}>{children}</AutoSkeleton>`. If the component cannot render without data, pass a `placeholder` rendered with sample data. That is the entire setup.

### Does it work with Next.js App Router and React Server Components?

Yes. The React entry carries a `'use client'` directive and can be imported from Server Components. For skeletons in the server HTML stream, pass a precomputed `layout` or provider `layouts`.

### How is this different from react-loading-skeleton or react-content-loader?

Those libraries give you building blocks and you compose the skeleton by hand, then keep it in sync with the real component forever. auto-skeleton measures the real component, so there is nothing to compose and nothing to keep in sync.

### Does it cause layout shift (CLS)?

Not when a layout is known. A `layout` prop, provider `layouts`, or a cache hit paints the skeleton at the exact final height on the first frame. With client-only measurement, set `minHeight` close to the expected height.

### Does it support dark mode?

Yes. The default colours are translucent greys that read well on any background. Override with the `color` and `highlight` props or the CSS variables.

### Can I use it with Vue, Svelte, Angular or plain HTML?

Yes. The core package has no framework dependency: `createSkeleton(element)` returns a DOM element you can insert anywhere. Dedicated Vue and Svelte wrappers are planned.

### What browsers are supported?

Any browser with `ResizeObserver`, `clip-path` and CSS custom properties: Chrome, Edge, Firefox, Safari 15.4 and later. The core degrades to a static skeleton where `prefers-reduced-motion` is set.

### Is it typed?

Fully. TypeScript declarations ship for both ESM and CommonJS and pass `arethetypeswrong` on every resolution mode.

## Development

```bash
pnpm install
pnpm exec playwright install chromium
pnpm check          # typecheck, lint, format, unit + browser tests, build, size
pnpm playground     # demo app on http://localhost:5174
```

## License

MIT © [Midhun](https://github.com/theengineeringmind)
