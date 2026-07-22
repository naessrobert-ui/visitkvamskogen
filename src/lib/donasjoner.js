import { supabase, hasSupabaseConfig } from './supabase.js';

// Vel dobler krone for krone, men bare inntil dette taket totalt.
export const DOBLINGSTAK = 150000;
export const KAMPANJEMÅL = 200000;

export const beregnDobling = (innkommet) => Math.min(innkommet, DOBLINGSTAK);

// Leser aggregert dagssum fra Supabase. Returnerer null når Supabase ikke er
// konfigurert, slik at komponenten kan falle tilbake til den statiske JSON-fila.
export const loadKampanjeStats = async () => {
  if (!hasSupabaseConfig || !supabase) return null;

  const { data, error } = await supabase.rpc('kampanje_dagsstats');
  if (error) {
    console.error('Kunne ikke hente kampanjestatistikk:', error.message);
    return null;
  }

  return (data || []).map((rad) => ({
    dato: rad.dato,
    belop: Number(rad.belop) || 0,
  }));
};

// Starter en Vipps-betaling via edge-funksjonen og returnerer URL-en brukeren
// skal sendes til for å fullføre i Vipps-appen.
export const startVippsBetaling = async ({ belop, dekkerMedlemskap, navn, epost }) => {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Betaling er ikke konfigurert ennå.');
  }

  const { data, error } = await supabase.functions.invoke('vipps-create-payment', {
    body: {
      belop,
      dekkerMedlemskap: Boolean(dekkerMedlemskap),
      navn: navn || null,
      epost: epost || null,
      origin: window.location.origin,
    },
  });

  if (error) throw new Error(error.message || 'Kunne ikke starte betaling.');
  if (!data?.redirectUrl) throw new Error('Fikk ingen betalingslenke fra Vipps.');

  return data.redirectUrl;
};
