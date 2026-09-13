# auto-skeleton

Loading skeletons measured from your real UI. Wrap a component, get a pixel-accurate shimmer placeholder, never hand-write a skeleton component again.

```tsx
import { AutoSkeleton } from 'auto-skeleton/react';

<AutoSkeleton loading={isLoading}>
  <ProfileCard user={user} />
</AutoSkeleton>;
```

- **Zero skeleton components.** Text lines, avatars, images, buttons and badges are detected from the rendered DOM.
- **Never drifts.** Change a font size or padding and the skeleton follows, because it is measured, not drawn.
- **Server and client.** Ship precomputed layouts and the server renders real blocks with no layout shift. Works with React Server Components.
- **No runtime cost you can measure.** One measurement per component per width, cached across mounts. The shimmer is a compositor-only transform. Under 3 kB brotlied for the core.
- **Enterprise details handled.** App-wide provider, configurable colours, `prefers-reduced-motion`, CSP nonce, `role="status"` and `aria-busy`, error fallback, block cap, typed for CJS and ESM.

## Install

```bash
npm install auto-skeleton
```

React 18 or 19 is an optional peer dependency, only needed for `auto-skeleton/react`.

## React

```tsx
import { AutoSkeleton, AutoSkeletonProvider } from 'auto-skeleton/react';

// Once, near the root of the app.
<AutoSkeletonProvider color="rgba(120, 120, 120, 0.2)" highlight="rgba(120, 120, 120, 0.4)">
  <App />
</AutoSkeletonProvider>;

// Anywhere below.
function Profile({ userId }) {
  const { data, isLoading } = useUser(userId);
  return (
    <AutoSkeleton loading={isLoading} cacheKey="profile" placeholder={<ProfileCard user={sampleUser} />}>
      <ProfileCard user={data} />
    </AutoSkeleton>
  );
}
```

While `loading` is true the component paints the best layout it already knows (a `layout` prop, a provider layout, or a cached one). If none exists for the current width it mounts the measurement source (the `placeholder` if given, otherwise `children`) into a hidden inert layer, measures it once, unmounts it, and stores the result. When `loading` flips to false the real children render and the skeleton fades out on top of them.

### Component props

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

### Configuration

Set once on `<AutoSkeletonProvider>` or per component. Providers nest and merge.

| Option               | Type                                                  | Default                     | Description                                                                                         |
| -------------------- | ----------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `color`              | `string`                                              | `rgba(128, 128, 128, 0.18)` | Block colour. Any CSS colour, so it can be a token like `var(--surface-muted)`.                     |
| `highlight`          | `string`                                              | `rgba(128, 128, 128, 0.34)` | Shimmer highlight colour.                                                                           |
| `duration`           | `number \| string`                                    | `1600`                      | One shimmer sweep, in ms or a CSS time.                                                             |
| `fade`               | `number \| string`                                    | `200`                       | CSS fade-out duration when content arrives.                                                         |
| `fadeDuration`       | `number`                                              | `200`                       | How long the fading skeleton stays mounted, in ms. Keep equal to `fade`. `0` disables the fade.     |
| `animate`            | `boolean`                                             | `true`                      | Shimmer on or off. Reduced-motion users never see it either way.                                    |
| `label`              | `string`                                              | `'Loading'`                 | Accessible label announced by screen readers.                                                       |
| `injectStyles`       | `boolean`                                             | `true`                      | Inject the default stylesheet. Set `false` and include `autoskeletonCSS` yourself under strict CSP. |
| `nonce`              | `string`                                              |                             | CSP nonce for the injected `<style>`.                                                               |
| `cache`              | `LayoutCache`                                         | shared                      | Cache instance. Use one per micro-frontend if they must not share.                                  |
| `layouts`            | `Record<string, SkeletonLayout>`                      |                             | Precomputed layouts by `cacheKey`. See [Server rendering](#server-rendering).                       |
| `onError`            | `(error: unknown) => void`                            |                             | Measurement threw. The component shows `minHeight` and the app keeps running.                       |
| `textScale`          | `number`                                              | `0.7`                       | Vertical scale of each text line box. Produces the thin-bar look.                                   |
| `minSize`            | `number`                                              | `2`                         | Blocks smaller than this in either dimension are dropped.                                           |
| `maxBackgroundBlock` | `number`                                              | `64`                        | Elements with a background or border up to this size become one block: avatars, badges, icons.      |
| `mergeGap`           | `number`                                              | `4`                         | Text fragments on the same line closer than this merge into one bar.                                |
| `textRadius`         | `string`                                              | `'4px'`                     | Border radius for text bars. Other blocks copy the source element's radius.                         |
| `maxBlocks`          | `number`                                              | `400`                       | Hard cap on blocks. Measurement stops early once reached.                                           |
| `classify`           | `(el) => 'skip' \| 'block' \| 'descend' \| undefined` |                             | Override the built-in rules per element.                                                            |

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

The `auto-skeleton/react` entry carries a `'use client'` directive, so it can be imported directly from React Server Components in Next.js and similar frameworks. The core entry has no React dependency and no module-level side effects.

## Performance

- **Measurement is one read pass.** Each element is classified with one `getComputedStyle` call and text is measured with `Range.getClientRects()`. No writes are interleaved, so there is no layout thrash.
- **It runs once per component per width.** Results are cached by `cacheKey` and width. A cached or provided layout is painted on the first frame and the measurement source is never mounted.
- **The source is unmounted after measuring.** While loading, the DOM holds only the skeleton blocks.
- **The shimmer is a compositor transform.** Each block has one pseudo-element animating `translateX`, offset so all blocks show a single coherent sweep. No style recalculation or layout runs per frame. The container uses `contain: layout style paint`.
- **Bounded output.** `maxBlocks` stops measurement early, so a giant table produces at most 400 blocks by default.
- **Resize is debounced** to one measurement per animation frame.

## Vanilla DOM

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

### Controlling what gets measured

Add `data-auto-skeleton` to any element:

```html
<div data-auto-skeleton="skip">not part of the skeleton</div>
<div data-auto-skeleton="block">painted as one rectangle</div>
<img data-auto-skeleton="descend" />
```

Built-in rules, in order: your `classify` callback, the data attribute, hidden elements are skipped, media and form controls are blocks, small elements with a background or border are blocks, everything else is descended into and its text is measured line by line.

## Styling

Props set CSS custom properties on the container, and the same variables can be set on any ancestor for theming or dark mode:

```css
:root {
  --auto-skeleton-color: rgba(128, 128, 128, 0.18);
  --auto-skeleton-highlight: rgba(128, 128, 128, 0.34);
  --auto-skeleton-duration: 1.6s;
  --auto-skeleton-fade: 200ms;
}
```

Blocks carry `.auto-skeleton__block--text`, `--media`, `--control` and `--box` for finer styling. The default stylesheet is exported as `autoskeletonCSS` if you would rather ship it in your own bundle.

## Accessibility

The skeleton container has `role="status"`, `aria-busy="true"` and an `aria-label` (default "Loading"), so screen readers announce the loading state once and ignore the individual blocks. The hidden measurement layer is `inert` and `aria-hidden`. The shimmer is disabled under `prefers-reduced-motion: reduce`.

## How it works

1. The source subtree is walked. Each element is classified as skip, block, or descend.
2. Text nodes are measured with `Range.getClientRects()`, one rect per rendered line. Fragments on the same line are merged; each line is shrunk vertically to a bar.
3. Blocks copy the source element's computed `border-radius`.
4. The result is a plain object of rectangles relative to the root. Rendering is a handful of absolutely positioned `div`s.

## Development

```bash
pnpm install
pnpm exec playwright install chromium
pnpm check          # typecheck, lint, format, unit + browser tests, build, size
pnpm playground     # demo app on http://localhost:5174
```

## License

MIT
