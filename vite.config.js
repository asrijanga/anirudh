import { defineConfig } from 'vite';

export default defineConfig({
  base: '/anirudh/',
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
