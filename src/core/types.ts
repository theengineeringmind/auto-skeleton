/**
 * The visual role of a skeleton block. Drives the CSS modifier class and
 * lets consumers style text bars differently from media or controls.
 */
export type BlockKind = 'text' | 'media' | 'control' | 'box';

/** One shimmer rectangle, positioned relative to the measured root. */
export interface SkeletonBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  /** A CSS `border-radius` value copied from the source element. */
  radius: string;
  kind: BlockKind;
}

/** The full result of measuring a subtree. Serializable and cacheable. */
export interface SkeletonLayout {
  width: number;
  height: number;
  blocks: SkeletonBlock[];
}

/**
 * How the walker should treat an element.
 * - `skip`: ignore this element and everything inside it.
 * - `block`: paint one rectangle covering the element and do not descend.
 * - `descend`: ignore the element's own box and walk its children.
 */
export type Classification = 'skip' | 'block' | 'descend';

export interface MeasureOptions {
  /**
   * Vertical scale applied to each text line box, centred on the line.
   * A value below 1 produces the familiar "thin bar" look. Default `0.7`.
   */
  textScale?: number;
  /** Blocks smaller than this in either dimension (px) are dropped. Default `2`. */
  minSize?: number;
  /**
   * Elements with a visible background or border that are at most this many
   * pixels in both dimensions are painted as a single block (avatars, badges,
   * icons). Larger ones are descended into. Default `64`.
   */
  maxBackgroundBlock?: number;
  /**
   * Adjacent text fragments on the same line closer than this (px) are
   * merged into one bar. Default `4`.
   */
  mergeGap?: number;
  /** Border radius applied to text bars. Default `'4px'`. */
  textRadius?: string;
  /**
   * Hard cap on the number of blocks produced. Measurement stops early once
   * it is reached, so a runaway tree (a 10,000 row table) cannot stall the
   * main thread or flood the DOM. Default `400`.
   */
  maxBlocks?: number;
  /**
   * Override classification per element. Return `undefined` to fall back to
   * the built-in rules and `data-auto-skeleton` attributes.
   */
  classify?: (element: Element) => Classification | undefined;
}

/** Visual configuration. Every value maps to a CSS custom property on the container. */
export interface SkeletonTheme {
  /** Block colour. Any CSS colour. Default `rgba(128, 128, 128, 0.18)`. */
  color?: string;
  /** Shimmer highlight colour. Default `rgba(128, 128, 128, 0.34)`. */
  highlight?: string;
  /** Duration of one shimmer sweep, in ms or any CSS time. Default `1600`. */
  duration?: number | string;
  /** Fade-out duration when content arrives, in ms or any CSS time. Default `200`. */
  fade?: number | string;
}

export interface RenderOptions extends SkeletonTheme {
  /** Run the shimmer animation. Default `true`. Reduced-motion users never see it. */
  animate?: boolean;
  /** Extra class names for the container. */
  className?: string;
  /** Accessible label announced by screen readers. Default `'Loading'`. */
  label?: string;
  /** Document to create elements in. Defaults to the global `document`. */
  document?: Document;
  /** Inject the default stylesheet into the document. Default `true`. */
  injectStyles?: boolean;
  /** CSP nonce applied to the injected `<style>` tag. */
  nonce?: string;
}

export type ResolvedMeasureOptions = Required<Omit<MeasureOptions, 'classify'>> &
  Pick<MeasureOptions, 'classify'>;
