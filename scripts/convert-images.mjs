#!/usr/bin/env node
// Konverterer JPG-bilder i public/assets/photos/ til AVIF + WebP.
// Idempotent: hopper over bilder som allerede har AVIF/WebP nyere enn JPG.

import { readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const PHOTOS_DIR = new URL('../public/assets/photos/', import.meta.url);
const AVIF_QUALITY = 55;
const WEBP_QUALITY = 78;

const formatSize = (b) => (b / 1024).toFixed(0) + ' kB';

const needsRebuild = async (srcPath, outPath) => {
  if (!existsSync(outPath)) return true;
  const [s, o] = await Promise.all([stat(srcPath), stat(outPath)]);
  return s.mtimeMs > o.mtimeMs;
};

const convert = async (srcPath, outPath, fn, label) => {
  if (!(await needsRebuild(srcPath, outPath))) {
    return { skipped: true, label };
  }
  await fn(srcPath, outPath);
  const { size } = await stat(outPath);
  return { skipped: false, label, size };
};

const toAvif = (src, out) =>
  sharp(src).avif({ quality: AVIF_QUALITY, effort: 6 }).toFile(out);

const toWebp = (src, out) =>
  sharp(src).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(out);

const run = async () => {
  const dir = PHOTOS_DIR.pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const files = (await readdir(dir)).filter((f) => /\.jpe?g$/i.test(f));
  if (files.length === 0) {
    console.log('Ingen JPG-filer funnet i', dir);
    return;
  }
  console.log(`Konverterer ${files.length} bilder...\n`);

  let totalOriginal = 0;
  let totalAvif = 0;
  let totalWebp = 0;

  for (const file of files) {
    const src = join(dir, file);
    const base = parse(file).name;
    const avifOut = join(dir, base + '.avif');
    const webpOut = join(dir, base + '.webp');

    const orig = (await stat(src)).size;
    totalOriginal += orig;

    const [avif, webp] = await Promise.all([
      convert(src, avifOut, toAvif, 'avif'),
      convert(src, webpOut, toWebp, 'webp'),
    ]);

    const avifSize = avif.size ?? (await stat(avifOut)).size;
    const webpSize = webp.size ?? (await stat(webpOut)).size;
    totalAvif += avifSize;
    totalWebp += webpSize;

    const status = [
      avif.skipped ? 'avif: cache' : `avif: ${formatSize(avifSize)} (${Math.round((1 - avifSize / orig) * 100)}% mindre)`,
      webp.skipped ? 'webp: cache' : `webp: ${formatSize(webpSize)} (${Math.round((1 - webpSize / orig) * 100)}% mindre)`,
    ].join(' · ');
    console.log(`  ${file.padEnd(40)} ${formatSize(orig).padStart(7)} → ${status}`);
  }

  console.log('\nTotalt:');
  console.log(`  JPG:  ${formatSize(totalOriginal).padStart(8)}`);
  console.log(`  AVIF: ${formatSize(totalAvif).padStart(8)}  (${Math.round((1 - totalAvif / totalOriginal) * 100)}% mindre)`);
  console.log(`  WebP: ${formatSize(totalWebp).padStart(8)}  (${Math.round((1 - totalWebp / totalOriginal) * 100)}% mindre)`);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
