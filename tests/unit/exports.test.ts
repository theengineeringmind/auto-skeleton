import { describe, expect, it } from 'vitest';
import * as core from '../../src/index';
import * as react from '../../src/react';

describe('public API', () => {
  it('exposes the documented core surface', () => {
    expect(Object.keys(core).sort()).toEqual(
      [
        'BLOCK_CLASS',
        'CONTAINER_CLASS',
        'DATA_ATTRIBUTE',
        'DEFAULT_MEASURE_OPTIONS',
        'FADING_CLASS',
        'LayoutCache',
        'STYLE_ID',
        'autoskeletonCSS',
        'blockClassName',
        'blockStyle',
        'classify',
        'containerStyle',
        'createSkeleton',
        'defaultLayoutCache',
        'ensureStyles',
        'isVisible',
        'kindOf',
        'layoutCacheKey',
        'measure',
        'mergeLineRects',
        'radiusOf',
        'renderSkeleton',
        'resolveMeasureOptions',
        'round',
        'sameLine',
        'scaleHeight',
        'themeStyle',
        'toRelative',
        'union',
        'updateSkeleton',
      ].sort(),
    );
  });

  it('exposes the React surface', () => {
    expect(Object.keys(react).sort()).toEqual(
      [
        'AutoSkeleton',
        'AutoSkeletonProvider',
        'LayoutCache',
        'autoskeletonCSS',
        'measure',
        'mergeConfig',
        'useAutoSkeletonConfig',
      ].sort(),
    );
  });
});
