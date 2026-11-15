import { verifyTravelerContactAssets } from './scripts/verifyTravelerContact';
import { buildIdentity } from './scripts/buildIdentity';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react(), buildIdentity(), { name: 'traveler-contact-identity', apply: 'build', buildStart() { verifyTravelerContactAssets(); } }],
  build: {
    // Photos and figures stay separate hashed files. The entry only loads
    // the picture on screen; the rest wait for a dynamic import.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
