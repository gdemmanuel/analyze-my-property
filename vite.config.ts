import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Optimize HMR for faster refreshes
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
  },
  // Cache optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'react-hook-form',
    ],
  },
});
