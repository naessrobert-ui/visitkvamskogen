import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const CONCURRENCY = 3;

const parseArguments = (values) => {
  const options = { dryRun: false, manifestPath: '', email: '' };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--dry-run') options.dryRun = true;
    else if (value === '--manifest') options.manifestPath = values[++index] || '';
    else if (value === '--email') options.email = values[++index] || '';
    else throw new Error(`Ukjent argument: ${value}`);
  }
  if (!options.manifestPath) throw new Error('Bruk --manifest <sti-til-manifest.json>.');
  return options;
};

const readEnvironmentFile = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf8');
    return Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (!match) return [];
      const rawValue = match[2].replace(/^(['"])(.*)\1$/, '$2');
      return [[match[1], rawValue]];
    }));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
};

const normalizeFolderPath = (value) => String(value || '')
  .replaceAll('\\', '/')
  .replace(/^\/+|\/+$/g, '')
  .replace(/\/{2,}/g, '/');

const cleanFileName = (name) => String(name || 'dokument')
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .replace(/-+/g, '-')
  .slice(-120);

const contentTypeFor = (extension) => ({
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  msg: 'application/vnd.ms-outlook',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
}[String(extension || '').toLowerCase()] || 'application/octet-stream');

const rowKey = (folderPath, fileName) => `${folderPath}\u0000${fileName}`;

const loadManifest = async (manifestPath) => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!manifest.documents || Array.isArray(manifest.documents)) throw new Error('Manifestet har ukjent dokumentformat.');
  const documents = Object.values(manifest.documents).map((document) => ({
    ...document,
    path: normalizeFolderPath(document.path),
    size: Number(document.size),
  }));
  const identities = new Set();
  for (const document of documents) {
    if (!document.name || document.name.length > 500) throw new Error('Manifestet inneholder et ugyldig filnavn.');
    if (!Number.isFinite(document.size) || document.size < 0) throw new Error(`Ugyldig filstørrelse for ${document.name}.`);
    if (!['downloaded', 'large'].includes(document.status)) throw new Error(`Dokumentet ${document.name} er ikke ferdig behandlet.`);
    if (document.status === 'large' && document.size <= MAX_FILE_SIZE) throw new Error(`Dokumentet ${document.name} er feilaktig merket som stort.`);
    const identity = rowKey(document.path, document.name);
    if (identities.has(identity)) throw new Error(`Duplikat i manifestet: ${document.path}/${document.name}`);
    identities.add(identity);
  }
  return documents.sort((a, b) => `${a.path}/${a.name}`.localeCompare(`${b.path}/${b.name}`, 'no'));
};

const verifyLocalFiles = async (documents) => {
  const errors = [];
  for (const document of documents.filter((entry) => entry.status === 'downloaded')) {
    if (!document.localPath) {
      errors.push(`${document.path}/${document.name}: mangler lokal sti`);
      continue;
    }
    try {
      const details = await stat(document.localPath);
      if (!details.isFile()) errors.push(`${document.path}/${document.name}: lokal sti er ikke en fil`);
      else if (details.size !== document.size) errors.push(`${document.path}/${document.name}: størrelsen avviker fra manifestet`);
      else if (details.size > MAX_FILE_SIZE) errors.push(`${document.path}/${document.name}: lokal fil er over 15 MB`);
    } catch (error) {
      errors.push(`${document.path}/${document.name}: ${error?.code === 'ENOENT' ? 'lokal fil mangler' : error.message}`);
    }
  }
  if (errors.length) throw new Error(`Kontrollen fant ${errors.length} feil:\n${errors.slice(0, 20).join('\n')}`);
};

const promptHidden = async (label) => {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await terminal.question(label);
    terminal.close();
    return answer.trim();
  }
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let answer = '';
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      process.stdin.off('data', onData);
      resolve(answer.trim());
    };
    const onData = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          reject(new Error('Importen ble avbrutt.'));
        } else if (character === '\r' || character === '\n') { finish(); return; }
        else if (character === '\u007f' || character === '\b') {
          if (answer) { answer = answer.slice(0, -1); process.stdout.write('\b \b'); }
        } else if (/\d/.test(character)) {
          answer += character;
          process.stdout.write('•');
        }
      }
    };
    process.stdin.on('data', onData);
  });
};

const authenticate = async (client, presetEmail) => {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const email = (presetEmail || await terminal.question('Administratorens e-postadresse: ')).trim().toLowerCase();
  terminal.close();
  if (!email.includes('@')) throw new Error('Oppgi en gyldig e-postadresse.');
  const { error: sendError } = await client.functions.invoke('send-vel-login-link', {
    body: { email, mode: 'code', origin: 'https://visitkvamskogen.no' },
  });
  if (sendError) throw sendError;
  console.log(`En engangskode er sendt til ${email}.`);
  const token = await promptHidden('Engangskode: ');
  const { error: verifyError } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (verifyError) throw verifyError;
  const { data: memberId, error: memberIdError } = await client.rpc('current_vel_member_id');
  if (memberIdError || !memberId) throw memberIdError || new Error('E-postadressen er ikke et aktivt styremedlem.');
  const { data: member, error: memberError } = await client.from('vel_members').select('id, is_admin').eq('id', memberId).single();
  if (memberError) throw memberError;
  if (!member.is_admin) throw new Error('Dokumentimporten krever administratortilgang.');
  return member.id;
};

const insertLargeDocuments = async (client, memberId, documents, existingRows) => {
  const pending = documents.filter((document) => {
    const existing = existingRows.get(rowKey(document.path, document.name));
    return document.status === 'large' && !existing;
  });
  for (let index = 0; index < pending.length; index += 100) {
    const rows = pending.slice(index, index + 100).map((document) => ({
      folder_path: document.path,
      file_name: document.name,
      file_size: document.size,
      content_type: contentTypeFor(document.extension),
      migration_status: 'review_large',
      search_text: `${document.path} ${document.name}`.trim(),
      source_modified_at: document.lastModifiedDateTime || null,
      uploaded_by: memberId,
    }));
    const { error } = await client.from('vel_documents').insert(rows);
    if (error) throw error;
  }
  return pending.length;
};

const uploadDocument = async (client, memberId, document, existing) => {
  const relativePath = `${document.path}/${document.name}`;
  const digest = createHash('sha256').update(relativePath).digest('hex').slice(0, 24);
  const storagePath = `${memberId}/onedrive-import/${digest}-${cleanFileName(document.name)}`;
  const fileContent = await readFile(document.localPath);
  const contentType = contentTypeFor(document.extension);
  const { error: uploadError } = await client.storage.from('vel-documents').upload(storagePath, fileContent, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  const values = {
    folder_path: document.path,
    file_name: document.name,
    file_size: document.size,
    content_type: contentType,
    storage_path: storagePath,
    migration_status: 'available',
    search_text: `${document.path} ${document.name}`.trim(),
    source_modified_at: document.lastModifiedDateTime || null,
    uploaded_by: memberId,
  };
  const metadataResult = existing
    ? await client.from('vel_documents').update(values).eq('id', existing.id)
    : await client.from('vel_documents').insert(values);
  if (metadataResult.error) {
    await client.storage.from('vel-documents').remove([storagePath]);
    throw metadataResult.error;
  }
};

const runPool = async (items, worker) => {
  let cursor = 0;
  const failures = [];
  let completed = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      try { await worker(item); } catch (error) { failures.push({ item, error }); }
      completed += 1;
      if (completed % 10 === 0 || completed === items.length) console.log(`Opplasting: ${completed}/${items.length}`);
    }
  });
  await Promise.all(runners);
  return failures;
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const manifestPath = path.resolve(options.manifestPath);
  const documents = await loadManifest(manifestPath);
  await verifyLocalFiles(documents);
  const downloaded = documents.filter((document) => document.status === 'downloaded');
  const large = documents.filter((document) => document.status === 'large');
  const totalBytes = downloaded.reduce((total, document) => total + document.size, 0);
  console.log(`Kontrollert ${documents.length} dokumenter: ${downloaded.length} klare for opplasting (${(totalBytes / 1024 / 1024).toFixed(1)} MB) og ${large.length} til vurdering.`);
  if (options.dryRun) return;

  const fileEnvironment = await readEnvironmentFile(path.resolve('.env.local'));
  const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnvironment.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnvironment.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Mangler VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY.');
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const memberId = await authenticate(client, options.email);
  const { data: existingData, error: existingError } = await client.from('vel_documents').select('id, folder_path, file_name, storage_path, migration_status');
  if (existingError) throw existingError;
  const existingRows = new Map((existingData || []).map((row) => [rowKey(row.folder_path, row.file_name), row]));
  const insertedLarge = await insertLargeDocuments(client, memberId, documents, existingRows);
  const pendingUploads = downloaded.filter((document) => {
    const existing = existingRows.get(rowKey(document.path, document.name));
    return !existing || existing.migration_status !== 'available' || !existing.storage_path;
  });
  const skippedUploads = downloaded.length - pendingUploads.length;
  const failures = await runPool(pendingUploads, (document) => uploadDocument(
    client,
    memberId,
    document,
    existingRows.get(rowKey(document.path, document.name)),
  ));
  await client.auth.signOut();
  console.log(`Ferdig: ${pendingUploads.length - failures.length} lastet opp, ${skippedUploads} allerede tilgjengelige og ${insertedLarge} nye på vurderingslisten.`);
  if (failures.length) {
    console.error(`${failures.length} dokumenter feilet. Kjør samme kommando på nytt for å fortsette.`);
    for (const failure of failures.slice(0, 20)) console.error(`${failure.item.path}/${failure.item.name}: ${failure.error.message}`);
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
