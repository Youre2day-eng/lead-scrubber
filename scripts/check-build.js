#!/usr/bin/env node
// Predeploy sanity check — fails if dist/index.html still references /src/*.
// Catches the regression where Vite build output is missing/skipped.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distIndex = resolve(process.cwd(), 'dist', 'index.html');

if (!existsSync(distIndex)) {
    console.error('[check-build] FAIL: dist/index.html does not exist. Did `vite build` run?');
    process.exit(1);
}

const html = readFileSync(distIndex, 'utf8');

if (/src="\/src\//.test(html) || /src='\/src\//.test(html)) {
    console.error('[check-build] FAIL: dist/index.html still references /src/* (un-built dev module).');
    console.error('[check-build] Cloudflare Pages will serve raw TypeScript and the page will be blank.');
    process.exit(1);
}

if (!/src="\/assets\/index-[A-Za-z0-9_-]+\.js"/.test(html)) {
    console.error('[check-build] FAIL: dist/index.html does not reference a hashed /assets/index-*.js bundle.');
    process.exit(1);
}

if (!/id="root"/.test(html)) {
    console.error('[check-build] FAIL: dist/index.html missing <div id="root">.');
    process.exit(1);
}

console.log('[check-build] OK: dist/index.html references hashed bundle and has #root mount point.');
