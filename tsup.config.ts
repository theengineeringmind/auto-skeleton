import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

// esbuild drops module directives when splitting chunks, so the React entry
// gets its 'use client' boundary re-applied after the build.
async function markClientOnly(files: string[]): Promise<void> {
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.startsWith("'use client';")) await writeFile(file, `'use client';\n${source}`);
  }
}

export default defineConfig({
  entry: { index: 'src/index.ts', react: 'src/react.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  target: 'es2020',
  external: ['react', 'react-dom'],
  onSuccess: () => markClientOnly(['dist/react.js', 'dist/react.cjs']),
});
