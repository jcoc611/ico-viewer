import * as esbuild from 'esbuild';
import { watch } from 'node:fs';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await Promise.all(['index.html','viewer.css'].map(f => copyFile(`web/${f}`, `dist/${f}`)));
const brandAssets = ['icon.svg', 'mark.svg', 'mark-dark.svg'];
await Promise.all(brandAssets.map(f => copyFile(`resources/branding/${f}`, `dist/${f}`)));
const configs = [
  { entryPoints: ['src/extension.ts'], outfile: 'dist/extension.cjs', platform: 'node', format: 'cjs', external: ['vscode'] },
  { entryPoints: ['src/viewer.ts'], outfile: 'dist/viewer.js', platform: 'browser', format: 'iife' }
];
for (const config of configs) {
  const options = { ...config, bundle: true, sourcemap: true, target: 'es2022' };
  if (process.argv.includes('--watch')) { const ctx = await esbuild.context(options); await ctx.watch(); }
  else await esbuild.build(options);
}

if(process.argv.includes('--watch')) {
  watch('web',(_,file)=>{if(['index.html','viewer.css'].includes(file))void copyFile(`web/${file}`,`dist/${file}`);});
  watch('resources/branding',(_,file)=>{if(brandAssets.includes(file))void copyFile(`resources/branding/${file}`,`dist/${file}`);});
}
