# Changelog

## 0.1.1

- Releases are published from GitHub Actions through npm trusted publishing with provenance. No token is stored.
- Playground imports the package by its published name.
- No library code changes.

## 0.1.0

Initial release.

- `measure()` turns any rendered subtree into a serializable list of skeleton blocks.
- `renderSkeleton()` / `createSkeleton()` for vanilla DOM usage.
- `<AutoSkeleton>` React component with cross-fade, resize re-measurement, layout cache, and SSR support.
- Coherent shimmer sweep across all blocks, respects `prefers-reduced-motion`.
- `data-auto-skeleton="skip|block|descend"` and a `classify` callback for overrides.
- Decorated elements that are empty (CSS images, dividers) or short and text-only (chips, badges) are painted as single blocks.
- `AutoSkeletonProvider` for app-wide defaults: theme, cache, measure options, and server-shipped `layouts`.
- `layout` prop and provider `layouts` render real blocks on the server with no client measurement.
- Theme props `color`, `highlight`, `duration`, `fade` on components, provider, and the DOM renderer.
- Shimmer runs as a compositor transform; skeletons cause no main-thread style or layout work while animating.
- Cache fast path: a known layout for a `cacheKey` paints on the first frame and the source is never mounted.
- `maxBlocks` cap (default 400) so oversized trees cannot stall measurement.
- `onError` callback with `minHeight` fallback; forwarded `ref`; `'use client'` boundary for React Server Components.
