/// <reference types="vite/client" />

declare module 'virtual:batches' {
  /** Every batch report in docs/results/batch-reports/, oldest first (vite.config.ts). */
  export const batches: import('./lib/batches').Batch[];
  /** The write-up that covers each batch, by batch name. */
  export const writeUpOf: Record<string, import('./lib/batches').WriteUpLink>;
}
