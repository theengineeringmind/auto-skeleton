import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Runs against the last build. Skipped when dist is absent (fresh checkout);
// `pnpm check` builds before this matters in CI.
describe.skipIf(!existsSync('dist/react.js'))('build output', () => {
  it('marks the React entry as a client module in both formats', () => {
    expect(readFileSync('dist/react.js', 'utf8').startsWith("'use client';")).toBe(true);
    expect(readFileSync('dist/react.cjs', 'utf8').startsWith("'use client';")).toBe(true);
  });

  it('keeps the core entry free of the directive and of React', () => {
    const core = readFileSync('dist/index.js', 'utf8');
    expect(core.startsWith("'use client';")).toBe(false);
    expect(core).not.toMatch(/from ["']react["']/);
  });
});
