import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site reads the repository's docs/ (two folders up) when it is built, so the dev server may
// serve files from the whole repository, not just this folder.
// Relative asset paths (base "./"): served from a domain's root by S3 + CloudFront, and still working
// if the site is ever served under a path. Routes are hash-based, so nothing else changes.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174, strictPort: true, fs: { allow: ['../..'] } },
  preview: { port: 4174, strictPort: true },
});
