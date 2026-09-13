import { afterEach, describe, expect, it } from 'vitest';
import {
  renderSkeleton,
  updateSkeleton,
  blockStyle,
  containerStyle,
  blockClassName,
  themeStyle,
} from '../../src/core/render';
import { STYLE_ID, autoskeletonCSS, ensureStyles } from '../../src/core/styles';
import type { SkeletonLayout } from '../../src/core/types';

const layout: SkeletonLayout = {
  width: 300,
  height: 120,
  blocks: [
    { x: 0, y: 0, width: 40, height: 40, radius: '50%', kind: 'media' },
    { x: 52, y: 4, width: 120.5, height: 11.2, radius: '4px', kind: 'text' },
    { x: 0, y: 80, width: 96, height: 32, radius: '6px', kind: 'control' },
  ],
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('renderSkeleton', () => {
  it('produces an accessible container with one element per block', () => {
    const el = renderSkeleton(layout);
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('auto-skeleton');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.getAttribute('aria-label')).toBe('Loading');
    expect(el.dataset['animate']).toBe('true');
    expect(el.style.height).toBe('120px');
    expect(el.style.getPropertyValue('--auto-skeleton-w')).toBe('300px');
    expect(el.children).toHaveLength(3);
  });

  it('positions and styles each block', () => {
    const el = renderSkeleton(layout);
    const [avatar, text] = Array.from(el.children) as HTMLElement[];
    expect(avatar!.className).toBe('auto-skeleton__block auto-skeleton__block--media');
    expect(avatar!.getAttribute('aria-hidden')).toBe('true');
    expect(avatar!.style.borderRadius).toBe('50%');
    expect(text!.className).toBe('auto-skeleton__block auto-skeleton__block--text');
    expect(text!.style.left).toBe('52px');
    expect(text!.style.top).toBe('4px');
    expect(text!.style.width).toBe('120.5px');
    expect(text!.style.height).toBe('11.2px');
    expect(text!.style.getPropertyValue('--_x')).toBe('52px');
  });

  it('applies options', () => {
    const el = renderSkeleton(layout, { animate: false, className: 'card', label: 'Fetching profile' });
    expect(el.className).toBe('auto-skeleton card');
    expect(el.dataset['animate']).toBe('false');
    expect(el.getAttribute('aria-label')).toBe('Fetching profile');
  });

  it('injects the stylesheet exactly once', () => {
    renderSkeleton(layout);
    renderSkeleton(layout);
    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1);
    expect(document.getElementById(STYLE_ID)!.textContent).toBe(autoskeletonCSS);
  });

  it('can skip style injection and pass a nonce', () => {
    renderSkeleton(layout, { injectStyles: false });
    expect(document.getElementById(STYLE_ID)).toBeNull();
    renderSkeleton(layout, { nonce: 'abc123' });
    expect(document.getElementById(STYLE_ID)!.getAttribute('nonce')).toBe('abc123');
  });

  it('renders into a custom document', () => {
    const other = document.implementation.createHTMLDocument('other');
    const el = renderSkeleton(layout, { document: other });
    expect(el.ownerDocument).toBe(other);
    expect(other.getElementById(STYLE_ID)).not.toBeNull();
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });
});

describe('updateSkeleton', () => {
  it('replaces blocks and container size', () => {
    const el = renderSkeleton(layout);
    updateSkeleton(el, { width: 100, height: 50, blocks: [layout.blocks[0]!] });
    expect(el.children).toHaveLength(1);
    expect(el.style.height).toBe('50px');
    expect(el.style.getPropertyValue('--auto-skeleton-w')).toBe('100px');
  });
});

describe('style helpers', () => {
  it('expose framework-neutral style objects', () => {
    expect(containerStyle(layout)).toEqual({ height: '120px', '--auto-skeleton-w': '300px' });
    expect(blockStyle(layout.blocks[1]!)).toEqual({
      left: '52px',
      top: '4px',
      width: '120.5px',
      height: '11.2px',
      borderRadius: '4px',
      '--_x': '52px',
    });
    expect(blockClassName(layout.blocks[2]!)).toBe('auto-skeleton__block auto-skeleton__block--control');
  });
});

describe('theme', () => {
  it('maps theme values to custom properties and accepts numbers as ms', () => {
    expect(themeStyle()).toEqual({});
    expect(themeStyle({ color: '#eee', highlight: 'white', duration: 900, fade: '0.3s' })).toEqual({
      '--auto-skeleton-color': '#eee',
      '--auto-skeleton-highlight': 'white',
      '--auto-skeleton-duration': '900ms',
      '--auto-skeleton-fade': '0.3s',
    });
  });

  it('applies the theme to rendered and updated skeletons', () => {
    const el = renderSkeleton(layout, { color: 'rgb(1, 2, 3)', duration: 500 });
    expect(el.style.getPropertyValue('--auto-skeleton-color')).toBe('rgb(1, 2, 3)');
    expect(el.style.getPropertyValue('--auto-skeleton-duration')).toBe('500ms');
    expect(el.style.getPropertyValue('--auto-skeleton-highlight')).toBe('');
    updateSkeleton(el, layout, { highlight: 'red' });
    expect(el.style.getPropertyValue('--auto-skeleton-highlight')).toBe('red');
  });
});

describe('ensureStyles', () => {
  it('returns the existing tag on repeat calls', () => {
    const a = ensureStyles();
    const b = ensureStyles();
    expect(a).toBe(b);
  });
});
