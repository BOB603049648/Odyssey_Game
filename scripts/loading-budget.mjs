import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { gzipSync } from 'node:zlib';
import { init, parse } from 'es-module-lexer';

// Build-level payload accounting, not a browser timing or a claim about the
// entire asset directory being downloaded. main.tsx explicitly imports App.
await init;
const dir = resolve(process.argv[2] ?? 'dist');
const entry = readFileSync(resolve(dir, 'index.html'), 'utf8').match(/src="([^\"]+\.js)"/)[1];
const files = new Set();
function visit(file, startup = false) {
  if (files.has(file)) return;
  files.add(file);
  const [imports] = parse(readFileSync(file, 'utf8'));
  for (const item of imports) {
    if (!item.n?.endsWith('.js')) continue;
    if (item.d >= 0 && !(startup && /\/App-/.test(item.n))) continue;
    visit(resolve(dirname(file), item.n));
  }
}
visit(resolve(dir, entry), true);
const js = [...files].sort().map(file => ({ file: basename(file), bytes: statSync(file).size,
  gzipBytes: gzipSync(readFileSync(file)).length }));
const assets = readdirSync(resolve(dir, 'assets')).map(file => ({ file, bytes: statSync(resolve(dir, 'assets', file)).size }));
const report = { titleStartupJs: { files: js, bytes: js.reduce((n, f) => n + f.bytes, 0),
  gzipBytes: js.reduce((n, f) => n + f.gzipBytes, 0) }, emittedAssetBytes: assets.reduce((n, f) => n + f.bytes, 0), assets };
writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ titleStartupJs: report.titleStartupJs, emittedAssetBytes: report.emittedAssetBytes }));
