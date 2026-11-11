import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' lets the same build run inside the Android app and on GitHub Pages (/<repo>/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 3000,
  },
});
