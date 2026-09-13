import { classify, kindOf, radiusOf } from './classify';
import { isVisible, mergeLineRects, scaleHeight, toRelative, type Rect } from './geometry';
import type { MeasureOptions, ResolvedMeasureOptions, SkeletonBlock, SkeletonLayout } from './types';

export const DEFAULT_MEASURE_OPTIONS: ResolvedMeasureOptions = {
  textScale: 0.7,
  minSize: 2,
  maxBackgroundBlock: 64,
  mergeGap: 4,
  textRadius: '4px',
  maxBlocks: 400,
  classify: undefined,
};

export function resolveMeasureOptions(options: MeasureOptions = {}): ResolvedMeasureOptions {
  const resolved: ResolvedMeasureOptions = { ...DEFAULT_MEASURE_OPTIONS };
  for (const key of Object.keys(options) as (keyof MeasureOptions)[]) {
    const value = options[key];
    if (value !== undefined) (resolved as Record<string, unknown>)[key] = value;
  }
  if (!(resolved.textScale > 0 && resolved.textScale <= 1)) {
    throw new RangeError(`auto-skeleton: textScale must be in (0, 1], got ${String(options.textScale)}`);
  }
  if (!(Number.isInteger(resolved.maxBlocks) && resolved.maxBlocks > 0)) {
    throw new RangeError(
      `auto-skeleton: maxBlocks must be a positive integer, got ${String(options.maxBlocks)}`,
    );
  }
  return resolved;
}

/**
 * Measure a rendered DOM subtree and describe it as a list of skeleton blocks.
 *
 * The root must be attached to a document and laid out (it may be
 * `visibility: hidden`, but not `display: none`). Coordinates in the result
 * are relative to the root's border box.
 */
export function measure(root: Element, options?: MeasureOptions): SkeletonLayout {
  const opts = resolveMeasureOptions(options);
  const win = root.ownerDocument.defaultView;
  if (!win) throw new Error('auto-skeleton: root element is not attached to a window');

  const rootRect = root.getBoundingClientRect();
  const origin = { left: rootRect.left, top: rootRect.top };
  const bounds = { width: rootRect.width, height: rootRect.height };

  const blocks: SkeletonBlock[] = [];
  const textRects: Rect[] = [];
  // Text rects are an upper bound on text bars (merging only reduces them),
  // so this is a conservative early-exit budget.
  const full = () => blocks.length + textRects.length >= opts.maxBlocks;

  const pushBlock = (element: Element) => {
    const rect = toRelative(element.getBoundingClientRect(), origin);
    if (!isVisible(rect, bounds, opts.minSize)) return;
    blocks.push({ ...rect, radius: radiusOf(win.getComputedStyle(element)), kind: kindOf(element) });
  };

  // Whitespace-only nodes are measured too: a space between two inline
  // elements has a real width and lets "Hello <b>world</b>" become one bar.
  // Collapsed whitespace (indentation between blocks) yields zero-size rects
  // that the size filter drops.
  const collectText = (node: Text) => {
    if (node.data.length === 0) return;
    const range = root.ownerDocument.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) {
      const rect = toRelative(r, origin);
      if (isVisible(rect, bounds, opts.minSize)) textRects.push(rect);
    }
    range.detach();
  };

  const walk = (element: Element) => {
    const parentVisibility = win.getComputedStyle(element).visibility;
    for (const child of Array.from(element.childNodes)) {
      if (full()) return;
      if (child.nodeType === Node.TEXT_NODE) {
        collectText(child as Text);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      const decision = classify(el, win, opts, { parentVisibility });
      if (decision === 'skip') continue;
      if (decision === 'block') {
        pushBlock(el);
        continue;
      }
      walk(el);
    }
  };

  // The root itself may be a single block (for example an <img>). Otherwise
  // its own box is never painted; only its contents are.
  const rootDecision = classify(root, win, opts, { root: true });
  if (rootDecision === 'block') {
    pushBlock(root);
  } else if (rootDecision === 'descend') {
    walk(root);
  }

  for (const line of mergeLineRects(textRects, opts.mergeGap)) {
    const scaled = scaleHeight(line, opts.textScale);
    blocks.push({ ...scaled, radius: opts.textRadius, kind: 'text' });
  }

  blocks.sort((a, b) => a.y - b.y || a.x - b.x);

  return {
    width: Math.round(bounds.width * 100) / 100,
    height: Math.round(bounds.height * 100) / 100,
    blocks: blocks.length > opts.maxBlocks ? blocks.slice(0, opts.maxBlocks) : blocks,
  };
}
