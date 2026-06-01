import { useMemo, useState } from 'react';

const LIVE_WEBCAM_IMAGES = [
  {
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/maxresdefault_live.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/maxresdefault_live.jpg',
    label: 'Furedalen bunn · webkamera',
  },
  {
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/maxresdefault.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/maxresdefault.jpg',
    label: 'Furedalen bunn · webkamera',
  },
  {
    src: 'https://img.youtube.com/vi/EjymYkpcQCs/hqdefault.jpg',
    label: 'Furedalen topp · webkamera',
  },
  {
    src: 'https://img.youtube.com/vi/kRhnJsErBdE/hqdefault.jpg',
    label: 'Furedalen bunn · webkamera',
  },
];

const ARCHIVE_WEATHER_IMAGE = {
  src: '/assets/photos/winter/utsikt-vinter.webp',
  label: 'Arkivbilde · Kvamskogen',
};

const ADMIN_SAKER = [
  {
    id: 'lavlandsloypen-2025',
    type: 'Adminsak',
    date: '2025-08-15',
    dateLabel: '15. august 2025',
    section: 'Friluft',
    image: '/assets/photos/summer/grusvei-stol.webp',
    title: 'Lavlandsløypen gir Kvamskogen en enklere helårstur',
    lede: 'En lettgått runde gjennom skogen gjør det enklere å velge kort tur, trilletur eller sykkeltur når fjellet ikke frister.',
    body: 'Løypen er tenkt som et lavterskeltilbud for hyttefolk, barnefamilier og besøkende som vil ha en tur uten å måtte opp i høyden. Den kan bli en fast redaksjonell sak som oppdateres med føre, bilder og praktisk informasjon gjennom året.',
  },
  {
    id: 'plan-kvamskogen-2026',
    type: 'Bakgrunn',
    date: '2026-04-20',
    dateLabel: '20. april 2026',
    section: 'Planer',
    image: '/assets/photos/summer/utsikt-fjord.webp',
    title: 'Områdeplanen: dette bør hytteeiere følge med på',
    lede: 'Fortetting, trafikk, vann og avløp er tema som kan forme Kvamskogen i mange år framover.',
    body: 'En nettavisflate gjør plansaker mer lesbare: kortversjon først, deretter hva saken betyr for hytteeiere, frister og lenker til kilder. Administrator kan holde denne typen basisartikler oppdatert uten at de drukner i vanlige nyhetskort.',
  },
  {
    id: 'loypeprep-finansiering-2026',
    type: 'Forklaring',
    date: '2026-05-10',
    dateLabel: '10. mai 2026',
    section: 'Vinter',
    image: '/assets/photos/winter/loypemaskin-natt.webp',
    title: 'Hvorfor løypebidraget betyr mer enn folk tror',
    lede: 'Preparerte løyper er en fellesgode-sak som egner seg godt som fast vinterjournalistikk.',
    body: 'Artikkelen kan ligge som en administrert basissak, men få nye ingresser når været, sesongen eller løypeinformasjonen tilsier det. Slik oppleves siden levende uten at alt må skrives på nytt hver gang.',
  },
];

const NYHETSIDEER = [
  {
    id: 'furedalen',
    label: 'Nyhetsovervåkning',
    title: 'AI kan finne lokale signaler — men bør ikke kopiere nettaviser',
    text: 'Et trygt oppsett er å hente overskrifter, dato, kilde og kort utdrag fra godkjente kilder, og la AI lage en egen oppsummering med tydelig kildehenvisning. Full artikkeltekst bør ikke kopieres.',
  },
  {
    id: 'bilder',
    label: 'Bilder',
    title: 'Bildebruk bør komme fra egne bilder, frie kilder eller administrator',
    text: 'Når en sak blir generert fra eksterne nyheter, kan systemet foreslå et lokalt stemningsbilde fra bildebanken. Eksterne pressebilder bør bare brukes når lisensen tillater det.',
  },
  {
    id: 'admin',
    label: 'Admin',
    title: 'Hemmelig kode må ligge på serveren — ikke i React-koden',
    text: 'En innlogget adminflate kan lagre saker i Supabase. Selve koden eller passordet bør sjekkes i en Edge Function, fordi alt som ligger i frontend kan leses av brukere.',
  },
];

const weatherNumber = (value) => {
  if (!value || value === '–') return null;
  const normalized = String(value).replace('+', '').replace('°', '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDayName = (isoDate) => {
  if (!isoDate) return 'en av dagene fremover';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('no-NO', { weekday: 'long' });
};

const makeWeatherArticle = (weather) => {
  const temp = weatherNumber(weather?.temp);
  const wind = weatherNumber(weather?.wind);
  const condition = weather?.cond && weather.cond !== '–' ? weather.cond.toLowerCase() : 'skiftende vær';
  const windText = wind === null ? 'vinden er ikke målt akkurat nå' : `vinden ligger rundt ${Math.round(wind)} m/s${weather?.windDir ? ` fra ${weather.windDir.toLowerCase()}` : ''}`;

  if (temp !== null && temp <= 0) {
    return {
      title: 'Kaldt drag over Kvamskogen: sjekk klær, føre og sikt før turen',
      lede: `Akkurat nå meldes ${weather.temp} og ${condition}. ${windText}.`,
      body: 'Når temperaturen ligger rundt null eller lavere, kan små endringer gi stor forskjell på veier, stier og skiløyper. Ta høyde for glatte partier, raskt værskifte og kaldere luft i høyden.',
    };
  }

  if (temp !== null && temp >= 16) {
    return {
      title: 'Mild dag på fjellet: god anledning til korte turer og utsiktspauser',
      lede: `Værbildet nå: ${weather.temp}, ${condition}, og ${windText}.`,
      body: 'På milde dager er lavterskelturene ekstra aktuelle. Lavlandsløypen, korte utsiktspunkt og en rolig kaffestopp passer godt når været spiller på lag.',
    };
  }

  return {
    title: 'Dagens værbit: slik ser Kvamskogen ut akkurat nå',
    lede: `Siste værdata viser ${weather?.temp || 'ukjent temperatur'}, ${condition}, og ${windText}.`,
    body: 'Saken kombinerer oppdatert Yr-data med et ferskt webkamerabilde når kameraet svarer. Dersom bildet er nede eller blir for mørkt, faller siden tilbake til arkivfoto i stedet for å vise en svart rute.',
  };
};

const rotateByDay = (items) => {
  const day = Math.floor(Date.now() / 86400000);
  return items.map((_, index) => items[(index + day) % items.length]);
};

const cacheKeyForWebcam = () => Math.floor(Date.now() / 300000);

const LiveWebcamPhoto = () => {
  const [imageIndex, setImageIndex] = useState(0);
  const [useArchive, setUseArchive] = useState(false);
  const cacheKey = useMemo(cacheKeyForWebcam, []);
  const image = useArchive ? ARCHIVE_WEATHER_IMAGE : LIVE_WEBCAM_IMAGES[imageIndex];

  const handleError = () => {
    if (imageIndex < LIVE_WEBCAM_IMAGES.length - 1) {
      setImageIndex((index) => index + 1);
      return;
    }
    setUseArchive(true);
  };

  const handleLoad = (event) => {
    if (useArchive) return;

    const img = event.currentTarget;
    try {
      const canvas = document.createElement('canvas');
      const width = 32;
      const height = 18;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(img, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      let brightness = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        brightness += (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
      }
      const average = brightness / (pixels.length / 4);
      if (average < 18) handleError();
    } catch (_) {
      // Dersom nettleseren sperrer pikselkontroll, beholder vi bildet som faktisk lastet.
    }
  };

  const src = useArchive ? image.src : `${image.src}?visitkvamskogen=${cacheKey}`;

  return (
    <div className="newspaper-photo-wrap">
      <img
        src={src}
        alt="Oppdatert bilde fra webkamera på Kvamskogen"
        className="newspaper-photo"
        crossOrigin="anonymous"
        onError={handleError}
        onLoad={handleLoad}
      />
      <span className="newspaper-photo-label">{image.label}</span>
    </div>
  );
};

const LeadStory = ({ weather }) => {
  const story = makeWeatherArticle(weather);
  return (
    <article className="newspaper-lead">
      <LiveWebcamPhoto />
      <div className="newspaper-lead-copy">
        <div className="newspaper-kicker">Været nå · webkamera og Yr</div>
        <h2>{story.title}</h2>
        <p className="newspaper-lede">{story.lede}</p>
        <p>{story.body}</p>
        <dl className="weather-facts">
          <div><dt>Temperatur</dt><dd>{weather?.temp || '–'}</dd></div>
          <div><dt>Vær</dt><dd>{weather?.cond || '–'}</dd></div>
          <div><dt>Vind</dt><dd>{weather?.wind || '–'} m/s</dd></div>
          <div><dt>Oppdatert</dt><dd>{weather?.updated || '–'}</dd></div>
        </dl>
      </div>
    </article>
  );
};

const makeForecastStory = (forecast) => {
  if (!forecast?.sunnyDay) return null;

  const dayName = formatDayName(forecast.sunnyDay.date);
  const temp = forecast.sunnyDay.maxTemp !== null ? `${Math.round(forecast.sunnyDay.maxTemp)}°` : 'milde temperaturer';
  const rain = forecast.sunnyDay.precipitation !== null ? `${forecast.sunnyDay.precipitation.toFixed(1).replace('.', ',')} mm` : 'lite nedbør';

  return {
    id: 'finvaer-varsel',
    section: 'Værvarsel',
    date: forecast.sunnyDay.date,
    dateLabel: dayName.charAt(0).toUpperCase() + dayName.slice(1),
    image: '/assets/photos/summer/utsikt-fjord.webp',
    title: `Yr peker ut ${dayName}: dette kan bli ukens finværsdag`,
    lede: `${forecast.sunnyDay.clearHours} timer med klart eller lettskyet vær, rundt ${temp} på det varmeste og bare ${rain} nedbør i prognosen.`,
    body: 'Når varselet peker ut en tydelig finværsdag, kan Aktuelt lage en egen sak med arkivbilde og konkrete turforslag. Dette er en tryggere bruk av arkivfoto enn i saken om været akkurat nå, som bør bruke webkamera når det er tilgjengelig.',
  };
};

const NewsCard = ({ post, featured = false }) => (
  <article className={featured ? 'newspaper-card featured' : 'newspaper-card'}>
    <img src={post.image} alt="" className="newspaper-card-image" />
    <div className="newspaper-card-body">
      <div className="newspaper-meta">
        <span>{post.section}</span>
        <time dateTime={post.date}>{post.dateLabel}</time>
      </div>
      <h3>{post.title}</h3>
      <p className="newspaper-card-lede">{post.lede}</p>
      {featured && <p>{post.body}</p>}
    </div>
  </article>
);

const ExplainerCard = ({ item }) => (
  <article className="newspaper-explainer-card">
    <span>{item.label}</span>
    <h3>{item.title}</h3>
    <p>{item.text}</p>
  </article>
);

const Aktuelt = ({ weather }) => {
  const forecastPost = makeForecastStory(weather?.forecast);
  const rotatedAdminPosts = rotateByDay(ADMIN_SAKER);
  const [firstPost, ...restPosts] = forecastPost ? [forecastPost, ...rotatedAdminPosts] : rotatedAdminPosts;

  return (
    <section className="section newspaper-section">
      <div className="container newspaper-container">
        <header className="newspaper-masthead">
          <div className="newspaper-masthead-top">
            <span>Visit Kvamskogen</span>
            <span>Aktuelt · levende forside</span>
            <span>{new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <h1>Kvamskogen Tidende</h1>
          <p>
            En mulig nettavisversjon av Aktuelt: webkamerabilde til været akkurat nå, Yr-varsel fremover, administrerte basissaker og en tydelig plan for AI-genererte lokale oppsummeringer.
          </p>
        </header>

        <LeadStory weather={weather} />

        <div className="newspaper-grid">
          <NewsCard post={firstPost} featured />
          <aside className="newspaper-sidebar" aria-label="Korte aktuelle saker">
            <div className="newspaper-sidebar-title">Dagens smånotiser</div>
            {restPosts.map((post) => <NewsCard key={post.id} post={post} />)}
          </aside>
        </div>

        <section className="newspaper-explainer" aria-labelledby="aktuelt-ai-plan">
          <div>
            <div className="newspaper-kicker">Forslag til neste fase</div>
            <h2 id="aktuelt-ai-plan">Slik kan siden bli automatisk uten å miste redaktørkontroll</h2>
            <p>
              Første versjon kan bygges trygt med Supabase for admin-saker, en serverjobb som henter vær og nyhetssignaler, og en AI-modell som skriver korte, kildebaserte utkast. Administrator publiserer eller overstyrer før det havner på forsiden.
            </p>
          </div>
          <div className="newspaper-explainer-grid">
            {NYHETSIDEER.map((item) => <ExplainerCard key={item.id} item={item} />)}
          </div>
        </section>
      </div>
    </section>
  );
};

export default Aktuelt;
