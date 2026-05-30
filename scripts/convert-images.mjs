#!/usr/bin/env node
// Les originalbilete frå _source/<sesong>/, konverter til AVIF + WebP,
// skriv til public/assets/photos/<sesong>/, og regenerer manifestet.
//
// Workflow:
//   1. Slipp original (JPG/PNG/HEIC) i _source/<sesong>/
//   2. npm run convert-images
//   3. AVIF + WebP ligg klart i public/assets/photos/<sesong>/
//   4. src/lib/hero-images.generated.js er regenerert
//
// _source/ er .gitignored — originalane vert aldri committa.

import { readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIR = join(ROOT, '_source');
const OUTPUT_DIR = join(ROOT, 'public', 'assets', 'photos');
const MANIFEST_FILE = join(ROOT, 'src', 'lib', 'hero-images.generated.js');

const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
const AVIF_QUALITY = 55;
const WEBP_QUALITY = 78;
const SUPPORTED = /\.(jpe?g|png|heic|heif|webp)$/i;

const formatSize = (b) => (b / 1024).toFixed(0) + ' kB';

// Normaliser filnavn: lowercase, æ→ae, ø→o, å→a, mellomrom→-, fjern parenteser
const normalize = (filename) => {
  const { name } = parse(filename);
  return name
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const needsRebuild = async (srcPath, outPath) => {
  if (!existsSync(outPath)) return true;
  const [s, o] = await Promise.all([stat(srcPath), stat(outPath)]);
  return s.mtimeMs > o.mtimeMs;
};

const convertOne = async (srcPath, outDir, baseName) => {
  const avifOut = join(outDir, baseName + '.avif');
  const webpOut = join(outDir, baseName + '.webp');
  const origSize = (await stat(srcPath)).size;
  const tasks = [];
  if (await needsRebuild(srcPath, avifOut)) {
    tasks.push(
      sharp(srcPath).rotate().avif({ quality: AVIF_QUALITY, effort: 6 }).toFile(avifOut)
        .then(() => ({ kind: 'avif', size: avifOut })),
    );
  }
  if (await needsRebuild(srcPath, webpOut)) {
    tasks.push(
      sharp(srcPath).rotate().webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(webpOut)
        .then(() => ({ kind: 'webp', size: webpOut })),
    );
  }
  await Promise.all(tasks);
  const [avifSize, webpSize] = await Promise.all([stat(avifOut), stat(webpOut)]);
  return { origSize, avifSize: avifSize.size, webpSize: webpSize.size, didWork: tasks.length > 0 };
};

const processSeason = async (season) => {
  const inDir = join(SOURCE_DIR, season);
  const outDir = join(OUTPUT_DIR, season);
  await mkdir(outDir, { recursive: true });

  let files = [];
  if (existsSync(inDir)) {
    files = (await readdir(inDir)).filter((f) => SUPPORTED.test(f));
  }

  const results = [];
  for (const file of files) {
    const srcPath = join(inDir, file);
    const baseName = normalize(file);
    try {
      const r = await convertOne(srcPath, outDir, baseName);
      results.push({ file, baseName, ...r });
    } catch (e) {
      console.error(`  ${file}: FEIL — ${e.message}`);
    }
  }
  return { season, results };
};

const collectExistingOutputs = async (season) => {
  const outDir = join(OUTPUT_DIR, season);
  if (!existsSync(outDir)) return [];
  const files = await readdir(outDir);
  const bases = new Set();
  for (const f of files) {
    const { name, ext } = parse(f);
    if (ext === '.avif' || ext === '.webp') bases.add(name);
  }
  return [...bases].sort();
};

const writeManifest = async (perSeason) => {
  const lines = [
    '// Auto-generert av scripts/convert-images.mjs — IKKJE rediger for hand.',
    '// Køyr `npm run convert-images` for å regenerere.',
    '',
    'export const BY_SEASON = {',
  ];
  for (const season of SEASONS) {
    const names = perSeason[season];
    const quoted = names.map((n) => `'${n}'`).join(', ');
    lines.push(`  ${season}: [${quoted}],`);
  }
  lines.push('};', '');
  await writeFile(MANIFEST_FILE, lines.join('\n'), 'utf8');
};

const run = async () => {
  let totalOrig = 0;
  let totalAvif = 0;
  let totalWebp = 0;
  let workDone = false;

  for (const season of SEASONS) {
    const { results } = await processSeason(season);
    if (results.length === 0) continue;
    console.log(`\n[${season}]`);
    for (const r of results) {
      if (r.didWork) workDone = true;
      totalOrig += r.origSize;
      totalAvif += r.avifSize;
      totalWebp += r.webpSize;
      const orig = formatSize(r.origSize).padStart(7);
      const avif = formatSize(r.avifSize).padStart(7);
      const webp = formatSize(r.webpSize).padStart(7);
      const status = r.didWork ? '' : '(cache)';
      console.log(`  ${r.file.padEnd(36)} → ${r.baseName.padEnd(32)} ${orig} → avif ${avif} · webp ${webp} ${status}`);
    }
  }

  const perSeason = {};
  for (const season of SEASONS) {
    perSeason[season] = await collectExistingOutputs(season);
  }
  await writeManifest(perSeason);

  console.log('\nManifest skreve til src/lib/hero-images.generated.js:');
  for (const season of SEASONS) {
    console.log(`  ${season}: ${perSeason[season].length} bilete`);
  }

  if (totalOrig > 0) {
    console.log('\nTotalt konvertert i denne runden:');
    console.log(`  Source: ${formatSize(totalOrig).padStart(8)}`);
    console.log(`  AVIF:   ${formatSize(totalAvif).padStart(8)}  (${Math.round((1 - totalAvif / totalOrig) * 100)}% mindre)`);
    console.log(`  WebP:   ${formatSize(totalWebp).padStart(8)}  (${Math.round((1 - totalWebp / totalOrig) * 100)}% mindre)`);
  } else if (!workDone) {
    console.log('\nIngen nye bilete å konvertere — manifest regenerert frå eksisterande output.');
  }
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
