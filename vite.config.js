import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [react()],
  server: {
    watch: {
      // Windows EBUSY when watching PDB assets opened by the browser/loader
      ignored: ['**/public/models/pdb/**'],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        whitepaper: './whitepaper.html',
        gallery: './gallery.html',
      },
    },
  },
});
