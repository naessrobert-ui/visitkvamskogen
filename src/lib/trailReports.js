const apiBase = (import.meta.env.VITE_LOYPE_API_URL || '').trim().replace(/\/+$/, '');

export const loadTrailReports = async (signal) => {
  if (!apiBase) throw new Error('Føremeldingene er ikke tilgjengelige akkurat nå.');
  const response = await fetch(`${apiBase}/api/kvamskogen/reports`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Kunne ikke hente føremeldinger. Prøv igjen om litt.');
  const payload = await response.json();
  if (!Array.isArray(payload.reports)) throw new Error('Kunne ikke lese føremeldingene.');
  return payload.reports;
};

export const reportImageUrl = (image) => `${apiBase}${image.url}`;

export const reportIsOld = (report, now = Date.now()) => (
  !Number.isFinite(Date.parse(report.observed_at)) || now - Date.parse(report.observed_at) > 24 * 3600 * 1000
);

export const formatReportTime = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Ukjent tidspunkt';
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo',
  }).format(date);
};
