import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const kolonner = [
  ['Medlemsnummer', 'medlemsnummer'], ['Fornavn', 'fornavn'], ['Etternavn', 'etternavn'],
  ['Hjemmeadresse', 'hjemmeadresse'], ['Postnummer', 'postnummer'], ['Poststed', 'poststed'],
  ['Telefon', 'mobil'], ['E-post', 'epost'], ['Tilknytning', 'stedstype'],
  ['Hytteadresse', 'hytteadresse'], ['Adresse for campingvogn', 'vognadresse'], ['Område fra tidligere skjema', 'omrade'],
  ['Kontingentår', 'kontingentar'], ['Betalt (kr)', 'belop_ore'], ['Betalt tidspunkt', 'betalt_at'],
  ['Vipps-referanse', 'vipps_referanse'], ['Velkomstmail sendt', 'epost_sendt_at'],
];

function csvFelt(value) {
  if (typeof value === 'number') return String(value).replace('.', ',');
  const original = String(value ?? '');
  const tekst = /^[\s\u200B\uFEFF]*[=+@-]/u.test(original) ? `'${original}` : original;
  return `"${tekst.replaceAll('"', '""')}"`;
}

async function eksporterInnmeldinger() {
  const rader = [];
  const sidestorrelse = 250;
  let sist = 0;
  while (true) {
    const { data, error } = await supabase.from('medlemskampanje')
      .select(kolonner.map(([, felt]) => felt).join(','))
      .gt('medlemsnummer', sist).order('medlemsnummer').limit(sidestorrelse);
    if (error) throw error;
    rader.push(...data);
    if (data.length < sidestorrelse) break;
    sist = data.at(-1).medlemsnummer;
  }
  if (!rader.length) return 0;

  const linjer = [kolonner.map(([tittel]) => csvFelt(tittel)).join(';')];
  for (const rad of rader) {
    linjer.push(kolonner.map(([, felt]) => csvFelt(felt === 'belop_ore' ? rad[felt] / 100 : rad[felt])).join(';'));
  }
  const fil = new Blob(['\uFEFF', linjer.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(fil);
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = 'kvamskogen-vel-betalte-innmeldinger.csv';
  lenke.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return rader.length;
}

export default function MedlemskampanjeAdmin({ onBack }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function lastNed() {
    setBusy(true);
    setMessage('');
    try {
      const count = await eksporterInnmeldinger();
      setMessage(count ? `Lastet ned ${count} betalte innmeldinger.` : 'Ingen betalte innmeldinger ennå.');
    } catch {
      setMessage('Kunne ikke hente innmeldinger. Prøv igjen eller kontakt administrator.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vel-view">
      <header className="vel-view-header">
        <div><h1>Innmeldingskampanje</h1><p>Last ned betalte innmeldinger for avstemming og overføring til StyreWeb. Importer postnummer som tekst i Excel, slik at postnummer som begynner på null beholder alle sifrene.</p></div>
        <button className="vel-secondary-dark" type="button" onClick={onBack}>Tilbake til styremedlemmer</button>
      </header>
      <div className="vel-view-actions">
        <button className="vel-primary" type="button" onClick={lastNed} disabled={busy}>{busy ? 'Henter innmeldinger …' : 'Last ned CSV for Excel'}</button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
