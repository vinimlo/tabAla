import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import manifest from './src/manifest.json';
import pkg from './package.json';

const manifestWithVersion = {
  ...manifest,
  version: pkg.version,
  description: pkg.description,
};

export default defineConfig(({ mode }) => ({
  base: '',
  plugins: [
    svelte(),
    crx({ manifest: manifestWithVersion }),
    {
      name: 'strip-crossorigin',
      enforce: 'post' as const,
      transformIndexHtml(html: string) {
        return html.replace(/ crossorigin/g, '');
      },
    },
    {
      name: 'clean-vite-output',
      closeBundle() {
        const viteDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist/.vite');
        if (fs.existsSync(viteDir)) {
          fs.rmSync(viteDir, { recursive: true });
        }
      },
    },
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/popup/components', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/popup/stores', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
    extensions: ['.ts', '.svelte', '.js', '.json'],
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  publicDir: 'public',
}));
