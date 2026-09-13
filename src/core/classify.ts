import type { BlockKind, Classification, ResolvedMeasureOptions } from './types';

const MEDIA = new Set(['img', 'svg', 'video', 'canvas', 'picture', 'iframe', 'object', 'embed', 'audio']);
const CONTROL = new Set(['input', 'textarea', 'select', 'button', 'progress', 'meter']);
const IGNORED = new Set([
  'script',
  'style',
  'template',
  'noscript',
  'br',
  'wbr',
  'head',
  'meta',
  'link',
  'title',
]);
const BLOCK_ROLES = new Set(['img', 'progressbar', 'slider', 'switch', 'checkbox', 'radio']);

export const DATA_ATTRIBUTE = 'data-auto-skeleton';

function isTransparent(color: string): boolean {
  if (!color || color === 'transparent') return true;
  const match = /^rgba?\(([^)]+)\)$/.exec(color);
  if (!match) return false;
  const parts = match[1]!.split(/[\s,/]+/).filter(Boolean);
  return parts.length === 4 && Number.parseFloat(parts[3]!) === 0;
}

function hasVisibleBorder(style: CSSStyleDeclaration): boolean {
  const widths = [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ];
  return widths.some((w) => Number.parseFloat(w) > 0) && style.borderTopStyle !== 'none';
}

function isEmptyLeaf(element: Element): boolean {
  if (element.childElementCount > 0) return false;
  return !(element.textContent ?? '').trim();
}

export function kindOf(element: Element): BlockKind {
  const tag = element.localName;
  if (MEDIA.has(tag) || element.getAttribute('role') === 'img') return 'media';
  if (CONTROL.has(tag)) return 'control';
  return 'box';
}

/**
 * Decide how to treat an element. Order of precedence:
 * 1. `options.classify` callback
 * 2. `data-auto-skeleton="skip|block|descend"` attribute
 * 3. Built-in rules (hidden, replaced/media, form controls, small decorated boxes)
 */
export interface ClassifyContext {
  /**
   * The root passed to `measure`. Roots are often deliberately hidden (a
   * clone used only for measurement), so hidden-ness is ignored for them.
   */
  root?: boolean;
  /**
   * Computed `visibility` of the parent. A child that merely inherits
   * `hidden` from a hidden root is still measured; one that sets it itself
   * is skipped.
   */
  parentVisibility?: string;
}

export function classify(
  element: Element,
  window: Window,
  options: ResolvedMeasureOptions,
  context: ClassifyContext = {},
): Classification {
  const custom = options.classify?.(element);
  if (custom) return custom;

  const attr = element.getAttribute(DATA_ATTRIBUTE);
  if (attr === 'skip' || attr === 'block' || attr === 'descend') return attr;

  const tag = element.localName;
  if (IGNORED.has(tag)) return 'skip';

  const style = window.getComputedStyle(element);
  if (style.display === 'none') return 'skip';
  if (!context.root) {
    const hidden = style.visibility === 'hidden' || style.visibility === 'collapse';
    if (hidden && style.visibility !== context.parentVisibility) return 'skip';
    if (Number.parseFloat(style.opacity) === 0) return 'skip';
  }

  if (MEDIA.has(tag) || CONTROL.has(tag)) return 'block';
  const role = element.getAttribute('role');
  if (role && BLOCK_ROLES.has(role)) return 'block';

  const decorated =
    style.backgroundImage !== 'none' || !isTransparent(style.backgroundColor) || hasVisibleBorder(style);
  if (decorated) {
    // A decorated element with nothing inside is pure visual (a CSS-only
    // image, gradient, divider or placeholder) and is painted whole.
    if (isEmptyLeaf(element)) return 'block';
    // A decorated element no taller than a line or two with only text inside
    // is a chip, badge, tag or pill: one shape, not a text bar.
    const rect = element.getBoundingClientRect();
    if (rect.height <= options.maxBackgroundBlock) {
      if (rect.width <= options.maxBackgroundBlock) return 'block';
      if (rect.width <= options.maxBackgroundBlock * 4 && element.childElementCount === 0) return 'block';
    }
  }
  return 'descend';
}

/** Read the element's border radius as a single CSS shorthand value. */
export function radiusOf(style: CSSStyleDeclaration): string {
  const norm = (value: string | undefined): string => (!value || value === '0' ? '0px' : value);
  const tl = norm(style.borderTopLeftRadius);
  const tr = norm(style.borderTopRightRadius);
  const br = norm(style.borderBottomRightRadius);
  const bl = norm(style.borderBottomLeftRadius);
  if (tl === tr && tr === br && br === bl) return tl;
  return `${tl} ${tr} ${br} ${bl}`;
}
