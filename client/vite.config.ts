import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      // Dev proxy to backend server (not used in production builds)
      '/api': {
        target: `http://localhost:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '__tests__/',
        '*.config.ts',
        'src/setupTests.ts',
        'src/vite-env.d.ts',
        '**/*.css',
        '**/*.svg',
        'src/main.tsx',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
