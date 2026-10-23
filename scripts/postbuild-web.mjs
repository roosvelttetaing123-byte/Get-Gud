#!/usr/bin/env node
/**
 * Finishes dist/ after `expo export --platform web`:
 *   - stamps a build id (git short sha + UTC time, or $BUILD_ID) into dist/sw.js and
 *     index.html (<meta name="gg-build">);
 *   - writes the service-worker precache list by scanning dist/;
 *   - drops the duplicate theme-color meta Expo injects from app.json (the template's wins);
 *   - copies index.html to 404.html (GitHub Pages deep links) and adds .nojekyll;
 *   - checks that every icon/splash/manifest link in index.html points at a real file.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = join(root, 'dist');
const fail = (msg) => {
  console.error(`postbuild-web: ${msg}`);
  process.exit(1);
};
if (!existsSync(join(dist, 'index.html'))) fail('dist/index.html not found; run expo export first');

const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const base = '/' + String(app.expo?.experiments?.baseUrl ?? '').replace(/^\/+|\/+$/g, '');
const basePrefix = base === '/' ? '' : base;

/* ---------- build id ---------- */
function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
}
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
const buildId = process.env.BUILD_ID || `${gitSha()}-${stamp}`;

/* ---------- precache list ---------- */
const SKIP = [/^404\.html$/, /^sw\.js$/, /^metadata\.json$/, /^splash\//, /(^|\/)\./];
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
let bytes = 0;
const precache = walk(dist)
  .map((p) => ({ rel: relative(dist, p).split(sep).join('/'), size: statSync(p).size }))
  .filter(({ rel }) => !SKIP.some((re) => re.test(rel)))
  .map(({ rel, size }) => {
    bytes += size;
    return rel === 'index.html' ? './' : rel;
  })
  .sort();

/* ---------- sw.js ---------- */
const swPath = join(dist, 'sw.js');
if (!existsSync(swPath)) fail('dist/sw.js missing (public/sw.js should be copied by expo export)');
let sw = readFileSync(swPath, 'utf8');
if (!sw.includes("'__BUILD_ID__'") || !sw.includes('/*__PRECACHE__*/ []')) fail('placeholders not found in dist/sw.js');
sw = sw.replace("'__BUILD_ID__'", JSON.stringify(buildId)).replace('/*__PRECACHE__*/ []', JSON.stringify(precache));
writeFileSync(swPath, sw);

/* ---------- index.html ---------- */
let html = readFileSync(join(dist, 'index.html'), 'utf8');
let themeSeen = false;
html = html.replace(/[ \t]*<meta\s+name="theme-color"[^>]*>\n?/g, (tag) => {
  if (themeSeen) return '';
  themeSeen = true;
  return tag;
});
html = html.replace(/<meta name="gg-build"[^>]*>\n?/, '');
html = html.replace('</head>', `<meta name="gg-build" content="${buildId}" />\n</head>`);
writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, '404.html'), html); // deep links (e.g. /Get-Gud/journal) load the app
writeFileSync(join(dist, '.nojekyll'), ''); // let GitHub Pages serve the _expo/ folder

/* ---------- link check ---------- */
const missing = [];
for (const [, href] of html.matchAll(/<link[^>]+href="([^"]+)"/g)) {
  if (!href.startsWith(basePrefix + '/')) continue;
  const file = join(dist, href.slice(basePrefix.length + 1));
  if (!existsSync(file)) missing.push(href);
}
if (missing.length) fail(`index.html links to missing files:\n  ${missing.join('\n  ')}`);

const splashCount = existsSync(join(dist, 'splash')) ? readdirSync(join(dist, 'splash')).length : 0;
console.log(
  `postbuild-web: build ${buildId}; precache ${precache.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB); ` +
    `${splashCount} launch screens`,
);
