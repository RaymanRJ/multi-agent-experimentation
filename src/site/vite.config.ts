import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { parseBatch, writeUpsByBatch } from './lib/batches';

const RESULTS = resolve(__dirname, '../../docs/results');
const VIRTUAL = 'virtual:batches';

/**
 * `virtual:batches`: a summary of every report in docs/results/batch-reports/, read when the site is
 * built, so a newly published batch is on the Results page without touching this code. Only the
 * summaries ship; a report's full text loads when it is opened. The dev server rebuilds it when a
 * report or write-up changes.
 */
function batches(): Plugin {
  const load = () => {
    const md = (dir: string) => readdirSync(resolve(RESULTS, dir)).filter((f) => f.endsWith('.md')).sort();
    const list = md('batch-reports').map((f) => parseBatch(f, readFileSync(resolve(RESULTS, 'batch-reports', f), 'utf8')));
    const writeUps = Object.fromEntries(
      md('write-ups').map((f) => [`results/write-ups/${f.slice(0, -3)}`, readFileSync(resolve(RESULTS, 'write-ups', f), 'utf8')]),
    );
    const links = writeUpsByBatch(list, writeUps, readFileSync(resolve(RESULTS, 'README.md'), 'utf8'));
    return `export const batches = ${JSON.stringify(list)};\nexport const writeUpOf = ${JSON.stringify(links)};\n`;
  };
  return {
    name: 'batches',
    resolveId: (id) => (id === VIRTUAL ? `\0${VIRTUAL}` : undefined),
    load: (id) => (id === `\0${VIRTUAL}` ? load() : undefined),
    configureServer(server) {
      server.watcher.add(RESULTS);
      const reload = (file: string) => {
        if (!file.startsWith(RESULTS)) return;
        const mod = server.moduleGraph.getModuleById(`\0${VIRTUAL}`);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', reload).on('change', reload).on('unlink', reload);
    },
  };
}

// The site reads the repository's docs/ (two folders up) when it is built, so the dev server may
// serve files from the whole repository, not just this folder.
// Relative asset paths (base "./"): served from a domain's root by S3 + CloudFront, and still working
// if the site is ever served under a path. Routes are hash-based, so nothing else changes.
export default defineConfig({
  base: './',
  plugins: [react(), batches()],
  server: { port: 5174, strictPort: true, fs: { allow: ['../..'] } },
  preview: { port: 4174, strictPort: true },
});
