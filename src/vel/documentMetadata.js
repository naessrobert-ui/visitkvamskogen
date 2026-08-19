export const DOCUMENT_THEMES = [
  'Møter',
  'Prosjekter og parkering',
  'Økonomi',
  'Styring og rutiner',
  'Kommunikasjon',
  'Annet',
];

export const DOCUMENT_THEME_ICONS = {
  Møter: '□',
  'Prosjekter og parkering': '↗',
  Økonomi: 'kr',
  'Styring og rutiner': '§',
  Kommunikasjon: '◇',
  Annet: '…',
};

export const MEETING_DOCUMENT_TYPES = ['Styremøter', 'Årsmøte', 'Andre møter'];

const normalizeFolderPath = (value) => String(value || '')
  .replaceAll('\\', '/')
  .replace(/^\/+|\/+$/g, '')
  .replace(/\/{2,}/g, '/');

const normalizeTheme = (value) => {
  if (value === 'Møter') return 'Møter';
  if (value === 'Prosjekter' || value === 'Parkering') return 'Prosjekter og parkering';
  if (value === 'Økonomi') return 'Økonomi';
  if (['Styrende dokumenter', 'Gjeldende dokumenter', 'Faste rutiner og nøkkelpersoner', 'How to - Bruksanvisninger'].includes(value)) return 'Styring og rutiner';
  if (value === 'Kommunikasjon') return 'Kommunikasjon';
  return 'Annet';
};

export const classifyDocumentPath = (folderPath) => {
  const parts = normalizeFolderPath(folderPath).split('/').filter(Boolean);
  const isDecadeFolder = /^\d{4}-\d{4}$/.test(parts[0] || '') && /^(19|20)\d{2}$/.test(parts[1] || '');
  const isYearFolder = /^(19|20)\d{2}$/.test(parts[0] || '');
  const rawTheme = isDecadeFolder ? parts[2] : isYearFolder ? parts[1] : parts[0];
  const theme = normalizeTheme(rawTheme);
  const rawMeetingType = isDecadeFolder ? parts[3] : isYearFolder ? parts[2] : null;
  return {
    theme,
    documentType: theme === 'Møter' && MEETING_DOCUMENT_TYPES.includes(rawMeetingType) ? rawMeetingType : theme === 'Møter' ? 'Andre møter' : null,
    documentYear: Number(isDecadeFolder ? parts[1] : isYearFolder ? parts[0] : 0) || null,
  };
};

export const documentMetadata = (document) => {
  const fallback = classifyDocumentPath(document.folder_path);
  return {
    theme: DOCUMENT_THEMES.includes(document.theme) ? document.theme : fallback.theme,
    documentType: document.document_type || fallback.documentType,
    documentYear: Number(document.document_year) || fallback.documentYear,
  };
};
