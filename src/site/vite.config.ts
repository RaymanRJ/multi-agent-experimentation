import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site reads the repository's docs/ (two folders up) when it is built, so the dev server may
// serve files from the whole repository, not just this folder.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true, fs: { allow: ['../..'] } },
  preview: { port: 4174, strictPort: true },
});
