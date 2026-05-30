#!/usr/bin/env node
// Leser GPX-filer fra _source/gpx/, stripper personlige data (puls, kadens, tid,
// power), decimerer punkter til minst MIN_DIST_M meter mellom hvert, og skriver
// kompakt JSON til public/data/<navn>.json med kun [lat, lon] (5 desimaler ~1m).
//
// Workflow:
//   1. Slipp GPX i _source/gpx/
//   2. npm run process-gpx
//   3. JSON ligger klart i public/data/

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIR = join(ROOT, '_source', 'gpx');
const OUTPUT_DIR = join(ROOT, 'public', 'data');

const MIN_DIST_M = 10; // minimum avstand mellom beholdte punkter

const haversine = (a, b) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const parseGpx = (xml) => {
  const pts = [];
  const re = /<trkpt\s+lat="([\-\d.]+)"\s+lon="([\-\d.]+)"/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    pts.push([parseFloat(m[1]), parseFloat(m[2])]);
  }
  return pts;
};

const decimate = (pts, minDistM) => {
  if (pts.length === 0) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    if (haversine(out[out.length - 1], pts[i]) >= minDistM) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
};

const round5 = (n) => Math.round(n * 1e5) / 1e5;

const bbox = (pts) => {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lat, lon] of pts) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { minLat, maxLat, minLon, maxLon };
};

const totalDistanceKm = (pts) => {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += haversine(pts[i - 1], pts[i]);
  return m / 1000;
};

const run = async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const files = (await readdir(SOURCE_DIR)).filter((f) => /\.gpx$/i.test(f));
  if (!files.length) {
    console.log('Ingen GPX-filer i _source/gpx/. Avbryter.');
    return;
  }
  for (const file of files) {
    const xml = await readFile(join(SOURCE_DIR, file), 'utf8');
    const raw = parseGpx(xml);
    const decimated = decimate(raw, MIN_DIST_M).map(([lat, lon]) => [round5(lat), round5(lon)]);
    const distKm = totalDistanceKm(decimated);
    const box = bbox(decimated);
    const name = parse(file).name;
    const out = {
      name,
      distanceKm: Math.round(distKm * 10) / 10,
      points: decimated,
      bbox: box,
    };
    const outPath = join(OUTPUT_DIR, name + '.json');
    await writeFile(outPath, JSON.stringify(out));
    const sizeKb = (JSON.stringify(out).length / 1024).toFixed(1);
    console.log(`${file}: ${raw.length} → ${decimated.length} punkter, ${out.distanceKm} km, ${sizeKb} kB → ${outPath}`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
