import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/anirudh/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        text: resolve(import.meta.dirname, 'text.html'),
      },
    },
  },
});
