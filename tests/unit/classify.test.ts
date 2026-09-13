import { afterEach, describe, expect, it } from 'vitest';
import { classify, kindOf, radiusOf } from '../../src/core/classify';
import { DEFAULT_MEASURE_OPTIONS } from '../../src/core/measure';

const opts = { ...DEFAULT_MEASURE_OPTIONS };

function el(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild!;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('classify precedence', () => {
  it('prefers the custom callback', () => {
    const img = el('<img alt="">');
    expect(classify(img, window, { ...opts, classify: () => 'skip' })).toBe('skip');
    expect(classify(img, window, { ...opts, classify: () => undefined })).toBe('block');
  });

  it('honours data-auto-skeleton attributes', () => {
    expect(classify(el('<img data-auto-skeleton="skip" alt="">'), window, opts)).toBe('skip');
    expect(classify(el('<p data-auto-skeleton="block">x</p>'), window, opts)).toBe('block');
    expect(classify(el('<img data-auto-skeleton="descend" alt="">'), window, opts)).toBe('descend');
    expect(classify(el('<img data-auto-skeleton="nonsense" alt="">'), window, opts)).toBe('block');
  });
});

describe('classify built-in rules', () => {
  it('skips non-visual tags', () => {
    expect(classify(el('<script></script>'), window, opts)).toBe('skip');
    expect(classify(el('<style></style>'), window, opts)).toBe('skip');
    expect(classify(el('<br>'), window, opts)).toBe('skip');
  });

  it('skips hidden elements', () => {
    expect(classify(el('<p style="display:none">x</p>'), window, opts)).toBe('skip');
    expect(classify(el('<p style="visibility:hidden">x</p>'), window, opts)).toBe('skip');
    expect(classify(el('<p style="opacity:0">x</p>'), window, opts)).toBe('skip');
  });

  it('does not skip a child that only inherits visibility from a hidden parent', () => {
    const p = el('<p style="visibility:hidden">x</p>');
    expect(classify(p, window, opts, { parentVisibility: 'hidden' })).toBe('descend');
  });

  it('ignores hidden-ness on the root', () => {
    expect(classify(el('<p style="visibility:hidden">x</p>'), window, opts, { root: true })).toBe('descend');
    expect(classify(el('<p style="opacity:0">x</p>'), window, opts, { root: true })).toBe('descend');
    expect(classify(el('<p style="display:none">x</p>'), window, opts, { root: true })).toBe('skip');
  });

  it('treats media and controls as blocks', () => {
    for (const html of [
      '<img alt="">',
      '<video></video>',
      '<canvas></canvas>',
      '<svg></svg>',
      '<button>x</button>',
      '<input>',
      '<select></select>',
      '<textarea></textarea>',
    ]) {
      expect(classify(el(html), window, opts), html).toBe('block');
    }
  });

  it('treats role="img" and similar as blocks', () => {
    expect(classify(el('<span role="img">🎉</span>'), window, opts)).toBe('block');
    expect(classify(el('<div role="progressbar"></div>'), window, opts)).toBe('block');
  });

  it('descends into plain containers', () => {
    expect(classify(el('<div><p>x</p></div>'), window, opts)).toBe('descend');
    expect(classify(el('<a href="#">link</a>'), window, opts)).toBe('descend');
  });

  it('treats small decorated boxes as blocks and large ones as containers', () => {
    const small = el('<span style="background:red">x</span>');
    small.getBoundingClientRect = () => ({ width: 24, height: 24 }) as DOMRect;
    expect(classify(small, window, opts)).toBe('block');

    const large = el('<div style="background:red">x</div>');
    large.getBoundingClientRect = () => ({ width: 300, height: 120 }) as DOMRect;
    expect(classify(large, window, opts)).toBe('descend');

    const bordered = el('<span style="border:1px solid black">x</span>');
    bordered.getBoundingClientRect = () => ({ width: 24, height: 24 }) as DOMRect;
    expect(classify(bordered, window, opts)).toBe('block');
  });

  it('ignores transparent backgrounds', () => {
    const span = el('<span style="background-color: rgba(0, 0, 0, 0)">x</span>');
    span.getBoundingClientRect = () => ({ width: 24, height: 24 }) as DOMRect;
    expect(classify(span, window, opts)).toBe('descend');
    const t = el('<span style="background-color: transparent">x</span>');
    t.getBoundingClientRect = () => ({ width: 24, height: 24 }) as DOMRect;
    expect(classify(t, window, opts)).toBe('descend');
  });
});

describe('kindOf', () => {
  it('maps tags to kinds', () => {
    expect(kindOf(el('<img alt="">'))).toBe('media');
    expect(kindOf(el('<span role="img"></span>'))).toBe('media');
    expect(kindOf(el('<button></button>'))).toBe('control');
    expect(kindOf(el('<div></div>'))).toBe('box');
  });
});

describe('radiusOf', () => {
  it('collapses uniform radii and expands mixed ones', () => {
    expect(
      radiusOf({
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
        borderBottomRightRadius: '8px',
        borderBottomLeftRadius: '8px',
      } as CSSStyleDeclaration),
    ).toBe('8px');
    expect(
      radiusOf({
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '0px',
        borderBottomRightRadius: '0px',
        borderBottomLeftRadius: '8px',
      } as CSSStyleDeclaration),
    ).toBe('8px 0px 0px 8px');
    expect(radiusOf({} as CSSStyleDeclaration)).toBe('0px');
  });
});
