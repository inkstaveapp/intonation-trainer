/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { swPlugin } from './build/sw-plugin';

export default defineConfig({
  plugins: [react(), swPlugin()],
  resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
