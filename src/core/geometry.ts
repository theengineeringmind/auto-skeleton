export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Round to two decimals so layouts serialize cleanly and compare stably. */
export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert a viewport-relative DOMRect into coordinates relative to `origin`. */
export function toRelative(rect: DOMRectReadOnly, origin: { left: number; top: number }): Rect {
  return {
    x: round(rect.left - origin.left),
    y: round(rect.top - origin.top),
    width: round(rect.width),
    height: round(rect.height),
  };
}

/** Shrink a rect vertically around its centre. */
export function scaleHeight(rect: Rect, scale: number): Rect {
  const height = round(rect.height * scale);
  return { ...rect, y: round(rect.y + (rect.height - height) / 2), height };
}

/** True when the two rects share at least half of the smaller one's vertical span. */
export function sameLine(a: Rect, b: Rect): boolean {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const overlap = bottom - top;
  if (overlap <= 0) return false;
  return overlap >= Math.min(a.height, b.height) * 0.5;
}

/** Bounding box of two rects. */
export function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: round(right - x), height: round(bottom - y) };
}

/**
 * Merge text fragments that sit on the same line and are horizontally close
 * into a single bar. Fragments are first grouped by vertical overlap, then
 * merged left to right when the gap between them is at most `gap`.
 */
export function mergeLineRects(rects: readonly Rect[], gap: number): Rect[] {
  if (rects.length === 0) return [];
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);

  // Group into lines by vertical overlap with the running union of the line.
  const lines: Rect[][] = [];
  let current: Rect[] = [];
  let currentBox: Rect | null = null;
  for (const r of sorted) {
    if (currentBox && sameLine(currentBox, r)) {
      current.push(r);
      currentBox = union(currentBox, r);
    } else {
      if (current.length) lines.push(current);
      current = [r];
      currentBox = r;
    }
  }
  if (current.length) lines.push(current);

  const out: Rect[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let acc = line[0]!;
    for (let i = 1; i < line.length; i++) {
      const next = line[i]!;
      const distance = next.x - (acc.x + acc.width);
      if (distance <= gap) {
        acc = union(acc, next);
      } else {
        out.push(acc);
        acc = next;
      }
    }
    out.push(acc);
  }
  return out;
}

/** Drop rects that are too small to matter or that fall entirely outside the bounds. */
export function isVisible(rect: Rect, bounds: { width: number; height: number }, minSize: number): boolean {
  if (rect.width < minSize || rect.height < minSize) return false;
  if (rect.x + rect.width <= 0 || rect.y + rect.height <= 0) return false;
  if (rect.x >= bounds.width || rect.y >= bounds.height) return false;
  return true;
}
