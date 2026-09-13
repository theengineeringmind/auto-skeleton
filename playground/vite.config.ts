import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = (file: string) => fileURLToPath(new URL(`../src/${file}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // The playground imports the package by its published name but resolves to
  // the local source, so the demo code is copy-pasteable and always current.
  resolve: {
    alias: [
      { find: '@theengineeringmind/auto-skeleton/react', replacement: src('react.ts') },
      { find: '@theengineeringmind/auto-skeleton', replacement: src('index.ts') },
    ],
  },
  server: { port: 5174, strictPort: false },
  build: { outDir: 'dist' },
});
