import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` being used in `vite` command, and design:// variables use `VITE_` prefix by default
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Explicitly define env variables for both dev and production builds
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy API requests to the Express server
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
      },
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
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            recharts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
