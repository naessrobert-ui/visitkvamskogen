import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ appType: 'custom', server: { middlewareMode: true } });

try {
  const { DocumentsView } = await vite.ssrLoadModule('/src/vel/VelApp.jsx');
  const document = (id, values) => ({
    id,
    file_name: `${id}.pdf`,
    file_size: 1024,
    folder_path: values.folder_path || `${values.document_year}/${values.theme}`,
    migration_status: 'available',
    source_modified_at: `${values.document_year || 2026}-01-02T12:00:00Z`,
    storage_path: `${id}.pdf`,
    ...values,
  });
  const documents = [
    document('styremote', { theme: 'Møter', document_type: 'Styremøter', document_year: 2026, document_date: '2026-02-03' }),
    document('arsmote', { theme: 'Møter', document_type: 'Årsmøte', document_year: 2025 }),
    document('prosjekt', { theme: 'Prosjekter og parkering', document_year: 2024 }),
    document('regnskap', { theme: 'Økonomi', document_year: 2023 }),
    document('vedtekter', { theme: 'Styring og rutiner', document_year: 2022 }),
    document('nyhetsbrev', { theme: 'Kommunikasjon', document_year: 2021 }),
    document('annet', { theme: 'Annet', document_year: null, folder_path: '' }),
    document('stor', { theme: 'Møter', document_type: 'Andre møter', document_year: 2020, migration_status: 'review_large', storage_path: null }),
  ];
  const html = renderToStaticMarkup(React.createElement(DocumentsView, {
    documents,
    onOpen: () => {},
    onUpload: () => {},
  }));

  for (const theme of ['Møter', 'Prosjekter og parkering', 'Økonomi', 'Styring og rutiner', 'Kommunikasjon', 'Annet']) assert.match(html, new RegExp(theme));
  assert.ok(html.indexOf('2026') < html.indexOf('2025'), 'Nyeste år skal vises først.');
  assert.match(html, /3\. feb\./);
  assert.match(html, /Endret 2\. jan\. 2025/);
  assert.match(html, /Styremøter/);
  assert.match(html, /Vurderes/);
  assert.match(html, /Uten år/);
  console.log('Dokumentarkivet grupperer tema, år, dato og vurderingsfiler korrekt.');
} finally {
  await vite.close();
}
