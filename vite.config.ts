/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { swPlugin } from './build/sw-plugin';

export default defineConfig({
  // Served from a sub-path on GitHub Pages (set by CI); the root everywhere else.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), swPlugin()],
  resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
