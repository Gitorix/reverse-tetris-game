import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  base: '/reverse-tetris-game/',
  plugins: [react()],
  build: {
    outDir: 'github-pages-dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: '127.0.0.1',
    strictPort: true,
  },
});
