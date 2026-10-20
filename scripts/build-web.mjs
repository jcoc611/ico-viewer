import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

// Build the standalone site separately from the extension and development output.
const outdir = 'dist/web';
await mkdir(outdir, { recursive: true });
const license = await readFile('LICENSE', 'utf8');
await esbuild.build({
  entryPoints: ['src/viewer.ts', 'web/viewer.css'],
  outdir,
  entryNames: '[name]',
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  banner: { js: `/*!\n${license.trim()}\n*/` },
});
const html = await readFile('web/index.html', 'utf8');
// Preserve readable fallback text while compacting markup and structured data.
const compact = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
  (_, open, json, close) => open + JSON.stringify(JSON.parse(json)) + close)
  .replace(/>\s+</g, '><').trim();
await writeFile(`${outdir}/index.html`, compact + '\n');
await copyFile('resources/branding/icon.svg', `${outdir}/icon.svg`);
console.log(`Minified web app built in ${outdir}/`);
