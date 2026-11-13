import { execFileSync } from 'node:child_process';
import type { Plugin } from 'vite';

/** Public, non-secret build identity so a test deployment can be verified. */
export function buildIdentity(): Plugin {
  let revision = 'unknown';
  let dirty = false;
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
  } catch { /* Source archives can be built without a Git checkout. */ }
  const identity = { revision, dirty, builtAt: new Date().toISOString() };
  return {
    name: 'odyssey-build-identity',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'odyssey-revision', content: revision + (dirty ? '-dirty' : '') }, injectTo: 'head' }];
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(identity, null, 2) + '\n' });
    },
  };
}
