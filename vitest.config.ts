/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/popup/components', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/popup/stores', import.meta.url)),
    },
    extensions: ['.ts', '.svelte', '.js', '.json'],
  },

  test: {
    globals: true,
    environment: 'jsdom',

    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build', '.git', '.atena', '.hefesto', 'docs'],

    setupFiles: ['./src/test/setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.atena/**',
        '.hefesto/**',
        'docs/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/types.ts',
        'src/test/**',
        'tests/**',
      ],
    },

    deps: {
      optimizer: {
        web: {
          include: ['svelte'],
        },
      },
    },
  },
});
