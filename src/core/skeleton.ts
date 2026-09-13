import { measure } from './measure';
import { renderSkeleton, updateSkeleton } from './render';
import type { MeasureOptions, RenderOptions, SkeletonLayout } from './types';

export interface SkeletonHandle {
  /** The skeleton element. Insert it wherever the content will appear. */
  readonly element: HTMLElement;
  /** The layout currently painted. */
  readonly layout: SkeletonLayout;
  /** Re-measure the source and repaint. Call after the container resizes. */
  update(): SkeletonLayout;
  /** Remove the element from the DOM. */
  destroy(): void;
}

/**
 * Measure `source` and return a live skeleton element for it. This is the
 * one-call vanilla API; frameworks wrappers compose `measure` and
 * `renderSkeleton` directly.
 */
export function createSkeleton(
  source: Element,
  options: MeasureOptions & RenderOptions = {},
): SkeletonHandle {
  let layout = measure(source, options);
  const element = renderSkeleton(layout, options);
  return {
    element,
    get layout() {
      return layout;
    },
    update() {
      layout = measure(source, options);
      updateSkeleton(element, layout, options);
      return layout;
    },
    destroy() {
      element.remove();
    },
  };
}
