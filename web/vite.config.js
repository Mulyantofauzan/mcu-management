import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const apiTarget = process.env.API_PROXY || 'http://localhost:3000';

export default defineConfig({
  plugins: [svelte()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 5173, proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  build: { outDir: 'dist', sourcemap: false }
});
