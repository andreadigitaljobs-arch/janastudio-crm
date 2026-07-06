import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: 'react',
      'react-dom': 'react-dom',
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['chart.js', 'react-chartjs-2'],
          utils: ['xlsx', 'papaparse'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  css: {
    devSourcemap: false,
  },
});
