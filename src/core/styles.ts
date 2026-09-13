export const STYLE_ID = 'auto-skeleton-styles';

/**
 * The default stylesheet. Exported so apps with a strict CSP can ship it in
 * their own CSS and pass `injectStyles: false`.
 *
 * Customise with CSS variables on any ancestor, or per instance through
 * the `color`, `highlight`, `duration` and `fade` options:
 * - `--auto-skeleton-color`      base block colour
 * - `--auto-skeleton-highlight`  shimmer highlight colour
 * - `--auto-skeleton-duration`   one shimmer sweep
 * - `--auto-skeleton-fade`       fade-out duration when content arrives
 *
 * The shimmer is a single `transform` animation per block pseudo-element,
 * offset so every block shows the same sweep. Transforms run on the
 * compositor, so an animating skeleton causes no style or layout work on
 * the main thread.
 */
export const autoskeletonCSS = `
.auto-skeleton {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  contain: layout style paint;
  --_c: var(--auto-skeleton-color, rgba(128, 128, 128, 0.18));
  --_h: var(--auto-skeleton-highlight, rgba(128, 128, 128, 0.34));
}
.auto-skeleton__block {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
  background-color: var(--_c);
}
.auto-skeleton[data-animate="true"] .auto-skeleton__block::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--_x) * -1);
  width: var(--auto-skeleton-w);
  background: linear-gradient(90deg, transparent 0%, var(--_h) 50%, transparent 100%);
  transform: translateX(-100%);
  animation: auto-skeleton-sweep var(--auto-skeleton-duration, 1.6s) linear infinite;
}
@keyframes auto-skeleton-sweep {
  to { transform: translateX(100%); }
}
.auto-skeleton--fading {
  opacity: 0;
  transition: opacity var(--auto-skeleton-fade, 200ms) ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .auto-skeleton[data-animate="true"] .auto-skeleton__block::after { animation: none; content: none; }
}
`.trim();

/**
 * Insert the stylesheet into `doc` once. Safe to call repeatedly and from
 * multiple bundles: the tag is looked up by id. Returns the style element.
 */
export function ensureStyles(doc: Document = document, nonce?: string): HTMLStyleElement {
  const existing = doc.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  if (nonce) style.setAttribute('nonce', nonce);
  style.textContent = autoskeletonCSS;
  (doc.head ?? doc.documentElement).appendChild(style);
  return style;
}
