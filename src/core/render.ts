import { ensureStyles } from './styles';
import type { RenderOptions, SkeletonBlock, SkeletonLayout, SkeletonTheme } from './types';

export const CONTAINER_CLASS = 'auto-skeleton';
export const BLOCK_CLASS = 'auto-skeleton__block';
export const FADING_CLASS = 'auto-skeleton--fading';

function cssTime(value: number | string): string {
  return typeof value === 'number' ? `${value}ms` : value;
}

/** Inline custom properties for a theme. Empty when nothing is set. */
export function themeStyle(theme: SkeletonTheme = {}): Record<string, string> {
  const style: Record<string, string> = {};
  if (theme.color !== undefined) style['--auto-skeleton-color'] = theme.color;
  if (theme.highlight !== undefined) style['--auto-skeleton-highlight'] = theme.highlight;
  if (theme.duration !== undefined) style['--auto-skeleton-duration'] = cssTime(theme.duration);
  if (theme.fade !== undefined) style['--auto-skeleton-fade'] = cssTime(theme.fade);
  return style;
}

/** Inline style for the container. Shared by the DOM renderer and framework wrappers. */
export function containerStyle(layout: SkeletonLayout, theme?: SkeletonTheme): Record<string, string> {
  return {
    ...themeStyle(theme),
    height: `${layout.height}px`,
    '--auto-skeleton-w': `${layout.width}px`,
  };
}

/** Inline style for one block. Shared by the DOM renderer and framework wrappers. */
export function blockStyle(block: SkeletonBlock): Record<string, string> {
  return {
    left: `${block.x}px`,
    top: `${block.y}px`,
    width: `${block.width}px`,
    height: `${block.height}px`,
    borderRadius: block.radius,
    '--_x': `${block.x}px`,
  };
}

export function blockClassName(block: SkeletonBlock): string {
  return `${BLOCK_CLASS} ${BLOCK_CLASS}--${block.kind}`;
}

function applyStyle(el: HTMLElement, style: Record<string, string>): void {
  for (const [key, value] of Object.entries(style)) {
    if (key.startsWith('--')) el.style.setProperty(key, value);
    else (el.style as unknown as Record<string, string>)[key] = value;
  }
}

/** Replace the container's blocks with those from a new layout. */
export function updateSkeleton(container: HTMLElement, layout: SkeletonLayout, theme?: SkeletonTheme): void {
  applyStyle(container, containerStyle(layout, theme));
  const doc = container.ownerDocument;
  const fragment = doc.createDocumentFragment();
  for (const block of layout.blocks) {
    const el = doc.createElement('div');
    el.className = blockClassName(block);
    el.setAttribute('aria-hidden', 'true');
    applyStyle(el, blockStyle(block));
    fragment.appendChild(el);
  }
  container.replaceChildren(fragment);
}

/**
 * Build a skeleton DOM element from a layout. The result is a `div` with
 * `role="status"` and `aria-busy="true"` that you can insert anywhere.
 */
export function renderSkeleton(layout: SkeletonLayout, options: RenderOptions = {}): HTMLElement {
  const doc = options.document ?? document;
  if (options.injectStyles !== false) ensureStyles(doc, options.nonce);

  const container = doc.createElement('div');
  container.className = options.className ? `${CONTAINER_CLASS} ${options.className}` : CONTAINER_CLASS;
  container.setAttribute('role', 'status');
  container.setAttribute('aria-busy', 'true');
  container.setAttribute('aria-label', options.label ?? 'Loading');
  container.dataset['animate'] = String(options.animate !== false);
  updateSkeleton(container, layout, options);
  return container;
}
