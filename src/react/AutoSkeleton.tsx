import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import {
  CONTAINER_CLASS,
  FADING_CLASS,
  blockClassName,
  blockStyle,
  containerStyle,
  defaultLayoutCache,
  ensureStyles,
  layoutCacheKey,
  measure,
  type MeasureOptions,
  type SkeletonLayout,
  type SkeletonTheme,
} from '../core';
import { mergeConfig, useAutoSkeletonConfig, type AutoSkeletonConfig } from './context';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface AutoSkeletonProps extends AutoSkeletonConfig {
  /** Show the skeleton instead of `children`. */
  loading: boolean;
  /** The real content. Also used as the measurement source unless `placeholder` is set. */
  children?: ReactNode;
  /**
   * What to measure while loading. Defaults to `children`. Pass a version
   * rendered with sample data when `children` cannot render without data,
   * or `null` to rely purely on `layout`, `cacheKey` and `minHeight`.
   */
  placeholder?: ReactNode;
  /**
   * A precomputed layout. Rendered as-is on the server and the client with
   * no measurement at all. Takes precedence over `cacheKey` and `layouts`.
   */
  layout?: SkeletonLayout;
  /**
   * Reuse a layout across mounts and across `loading` cycles. Layouts are
   * keyed by this name and the container width. A cached or provided layout
   * for the name is painted on the first frame; the source is only mounted
   * and measured when no layout exists for the current width.
   */
  cacheKey?: string;
  /** Height used before the first measurement and during SSR without a layout. */
  minHeight?: number | string;
  /** Wrapper element type. Default `'div'`. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Extra class names for the skeleton container. */
  skeletonClassName?: string;
  /** Called whenever a layout is measured, provided, or read from the cache. */
  onLayout?: (layout: SkeletonLayout) => void;
}

const MEASURE_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  clipPath: 'inset(50%)',
  overflow: 'hidden',
  pointerEvents: 'none',
  userSelect: 'none',
};

const OVERLAY_STYLE: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0 };

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

const isDev = typeof process !== 'undefined' && process.env?.['NODE_ENV'] !== 'production';

/**
 * Wrap any content and get a pixel-accurate skeleton for it while `loading`
 * is true, with a cross-fade to the real content when it flips to false.
 */
export const AutoSkeleton = forwardRef<HTMLElement, AutoSkeletonProps>(function AutoSkeleton(props, ref) {
  const context = useAutoSkeletonConfig();
  const {
    loading,
    children,
    placeholder,
    layout: layoutProp,
    cacheKey,
    minHeight,
    as: Tag = 'div',
    className,
    style,
    skeletonClassName,
    onLayout,
    ...ownConfig
  } = props;
  const config = mergeConfig(context, ownConfig);
  const {
    fadeDuration = 200,
    animate = true,
    label = 'Loading',
    injectStyles = true,
    nonce,
    cache = defaultLayoutCache,
    layouts,
    onError,
    color,
    highlight,
    duration,
    fade,
    textScale,
    minSize,
    maxBackgroundBlock,
    mergeGap,
    textRadius,
    maxBlocks,
    classify,
  } = config;

  const wrapperRef = useRef<HTMLElement | null>(null);
  useImperativeHandle(ref, () => wrapperRef.current as HTMLElement, []);
  const measureRef = useRef<HTMLDivElement | null>(null);

  // First-frame layout without touching the DOM: an explicit prop, a
  // provided (server-shipped) layout, or the freshest cache entry for the key.
  const [initialLayout] = useState<SkeletonLayout | null>(() => {
    if (layoutProp) return layoutProp;
    if (cacheKey === undefined) return null;
    return layouts?.[cacheKey] ?? cache.latest(cacheKey) ?? null;
  });
  const [measured, setMeasured] = useState<SkeletonLayout | null>(null);
  const layout = layoutProp ?? measured ?? initialLayout;

  // The source is only mounted when there is nothing better to show, which
  // keeps repeat loads free of any measurement or extra rendering.
  const [needsSource, setNeedsSource] = useState(initialLayout === null && layoutProp === undefined);

  const [prevLoading, setPrevLoading] = useState(loading);
  const [fading, setFading] = useState(false);
  if (prevLoading !== loading) {
    setPrevLoading(loading);
    setFading(!loading && layout !== null && fadeDuration > 0);
  }
  useEffect(() => {
    if (!fading) return;
    const timer = setTimeout(() => setFading(false), fadeDuration);
    return () => clearTimeout(timer);
  }, [fading, fadeDuration]);

  const measureOptions = useMemo<MeasureOptions>(
    () => ({ textScale, minSize, maxBackgroundBlock, mergeGap, textRadius, maxBlocks, classify }),
    [textScale, minSize, maxBackgroundBlock, mergeGap, textRadius, maxBlocks, classify],
  );
  const theme = useMemo<SkeletonTheme>(
    () => ({ color, highlight, duration, fade }),
    [color, highlight, duration, fade],
  );

  const callbacks = useRef({ onLayout, onError });
  useEffect(() => {
    callbacks.current = { onLayout, onError };
  }, [onLayout, onError]);
  const layoutRef = useRef<SkeletonLayout | null>(null);
  useIsomorphicLayoutEffect(() => {
    layoutRef.current = layout;
  });
  const reported = useRef<SkeletonLayout | null>(null);
  const report = useCallback((next: SkeletonLayout) => {
    if (reported.current === next) return;
    reported.current = next;
    callbacks.current.onLayout?.(next);
  }, []);

  const runMeasure = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || layoutProp) return;
    const width = wrapper.clientWidth;

    // Already have a layout for this width: nothing to do, and the source
    // can go (or stay unmounted).
    const current = layoutRef.current;
    if (current && Math.abs(current.width - width) <= 1) {
      setNeedsSource(false);
      report(current);
      return;
    }

    const key = cacheKey === undefined ? undefined : layoutCacheKey(cacheKey, width);
    let next = key === undefined ? undefined : lookupLayout(cache, layouts, cacheKey, key, width);
    if (!next) {
      const source = measureRef.current;
      if (!source) {
        // Nothing to measure at this width. Ask for the source and try again
        // once it has rendered.
        setNeedsSource(true);
        return;
      }
      try {
        next = measure(source, measureOptions);
      } catch (error) {
        callbacks.current.onError?.(error);
        if (isDev && !callbacks.current.onError) console.error('auto-skeleton: measurement failed', error);
        return;
      }
      if (key !== undefined) cache.set(key, next);
    }
    setMeasured(next);
    setNeedsSource(false);
    report(next);
  }, [cache, cacheKey, layoutProp, layouts, measureOptions, report]);

  useIsomorphicLayoutEffect(() => {
    if (!loading) return;
    if (injectStyles) ensureStyles(document, nonce);
    if (layoutProp) {
      report(layoutProp);
      return;
    }
    const source = measureRef.current;
    if (source) source.inert = true;
    runMeasure();

    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    let lastWidth = wrapper.clientWidth;
    const observer = new ResizeObserver(() => {
      const width = wrapper.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(runMeasure);
    });
    observer.observe(wrapper);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [loading, needsSource, runMeasure, injectStyles, nonce, layoutProp, report]);

  const source = placeholder === undefined ? children : placeholder;
  const mountSource = loading && needsSource && source != null;
  const showSkeleton = loading || fading;
  const state = loading ? 'loading' : fading ? 'fading' : 'idle';

  if (isDev && loading && layout === null && source == null && minHeight === undefined) {
    console.warn(
      'auto-skeleton: nothing to measure and no layout, cacheKey, or minHeight given; the skeleton will be empty.',
    );
  }

  const skeletonStyle: CSSProperties = layout
    ? { ...(containerStyle(layout, theme) as CSSProperties), ...(fading ? OVERLAY_STYLE : null) }
    : { height: minHeight ?? 0 };

  return (
    <Tag
      ref={wrapperRef}
      className={className}
      style={{ position: 'relative', ...style }}
      data-auto-skeleton-state={state}
    >
      {mountSource ? (
        <div ref={measureRef} aria-hidden style={MEASURE_STYLE}>
          {source}
        </div>
      ) : null}
      {showSkeleton ? (
        <div
          className={cx(CONTAINER_CLASS, fading && FADING_CLASS, skeletonClassName)}
          role="status"
          aria-busy={loading}
          aria-label={label}
          data-animate={String(animate)}
          style={skeletonStyle}
        >
          {layout?.blocks.map((block, index) => (
            <div key={index} className={blockClassName(block)} aria-hidden style={blockStyle(block)} />
          ))}
        </div>
      ) : null}
      {loading ? null : children}
    </Tag>
  );
});

/** Resolve a layout for a key at a width from the cache or provided layouts, without measuring. */
function lookupLayout(
  cache: NonNullable<AutoSkeletonConfig['cache']>,
  layouts: AutoSkeletonConfig['layouts'],
  name: string | undefined,
  key: string,
  width: number,
): SkeletonLayout | undefined {
  const cached = cache.get(key);
  if (cached) return cached;
  const provided = name === undefined ? undefined : layouts?.[name];
  if (provided && Math.abs(provided.width - width) <= 1) return provided;
  return undefined;
}
