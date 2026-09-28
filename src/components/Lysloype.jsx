import { useState } from 'react';
import Link from './Link.jsx';

const IMG = '/assets/photos/lys';

const SCENES = [
  { id: 'vinter-1', label: 'Vinter, snøvær', alt: 'lavlandsløypa en vinterkveld i snøvær', portrait: true },
  { id: 'vinter-2', label: 'Vinter', alt: 'grusveien inn mot lavlandsløypa en vinterkveld', portrait: false },
  { id: 'vinter-3', label: 'Vinter i skogen', alt: 'den rette strekningen langs skogen en vinterkveld', portrait: true },
  { id: 'host', label: 'Høst', alt: 'lavlandsløypa en høstkveld', portrait: true },
  { id: 'sommer', label: 'Sensommer', alt: 'lavlandsløypa en sen sommerkveld', portrait: true },
];

const LIGHT = [
  { title: 'Lys der det trengs', text: 'Moderne LED-armaturer retter lyset ned mot løypa, med lite lys opp mot himmelen og ut mot hyttene rundt.' },
  { title: 'Lavt strømforbruk', text: 'LED bruker langt mindre strøm enn eldre lysanlegg og har lang levetid.' },
  { title: 'Styring', text: 'Tidsur og dimming gjør at lyset bare står på når det er behov, for eksempel frem til et fast klokkeslett om kvelden.' },
  { title: 'Hele året', text: 'Løypa brukes både til tur og ski, så lyset kommer til nytte i hele den mørke delen av året, ikke bare når det er snø.' },
];

const STEPS = [
  { title: 'Er det ønsket?', text: 'Saken tas opp på medlemsmøtet 24. oktober. Spørsmålet nå er bare om det er interesse for å jobbe videre med dette.', now: true },
  { title: 'Grunneiere', text: 'Stolper, kabel og strømtilførsel krever avtale med grunneierne der anlegget skal stå. Uten dette blir det ingen lysløype.' },
  { title: 'Myndigheter', text: 'Et lysanlegg må avklares med Kvam herad og eventuelt andre myndigheter, blant annet etter plan- og bygningsloven og gjeldende reguleringsplaner.' },
  { title: 'Finansiering', text: 'Anlegget må være fullfinansiert før det kan bygges.' },
  { title: 'Bygging, eierskap og drift', text: 'Det må være klart hvem som eier anlegget, og hvem som betaler strøm og vedlikehold hvert år.' },
];

const FUNDERS = [
  'Spillemidler, som kan dekke inntil en tredjedel av godkjent kostnad',
  'Kvam herad',
  'Næringslivet på Kvamskogen og i Kvam',
  'Sponsorer, stiftelser og banker',
  'Kvamskogen Vel og andre lag og foreninger',
  'Dugnad',
];

const BeforeAfter = ({ scene }) => {
  const [pos, setPos] = useState(50);
  return (
    <div className={`lys-ba${scene.portrait ? ' is-portrait' : ''}`}>
      <img src={`${IMG}/${scene.id}-med-lys.webp`} alt={`Illustrasjon: ${scene.alt} med LED-lys`} />
      <div className="lys-ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={`${IMG}/${scene.id}-i-dag.webp`} alt={`${scene.alt}, slik det ser ut i dag`} />
      </div>
      <div className="lys-ba-handle" style={{ left: `${pos}%` }} />
      <span className="lys-ba-label is-left">I dag</span>
      <span className="lys-ba-label is-right">Med lys</span>
      <input
        type="range" min="0" max="100" value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Sammenlign i dag og med lys"
      />
    </div>
  );
};

const Lysloype = () => {
  const [active, setActive] = useState(0);
  const scene = SCENES[active];

  return (
    <section className="section plansaker-page lys-page">
      <div className="container plansaker-container">
        <header className="plansaker-hero">
          <div>
            <div className="eyebrow winter"><span className="dot"/>Kvamskogen Vel · Sak til medlemsmøtet</div>
            <h1>Lysløype på Jonshøgdi/Leite?</h1>
            <p className="lede">Det er meldt inn ønske om lys langs lavlandsløypa på Jonshøgdi/Leite, slik at den kan brukes på ettermiddager og kvelder i den mørke delen av året. Før noe annet skjer, vil Vel'et høre om dette er noe hytte- og vogneierne ønsker.</p>
            <div className="plansaker-actions">
              <Link className="btn btn-primary" to="/medlemsmote">Til medlemsmøtet 24. oktober</Link>
              <a className="btn btn-ghost" href="#bilder">Se hvordan det kan se ut</a>
            </div>
          </div>
          <aside className="plansaker-status lys-status" style={{ backgroundImage: `linear-gradient(180deg, rgba(11,36,51,0.1), rgba(11,36,51,0.92) 70%), url(${IMG}/vinter-1-med-lys.webp)` }}>
            <span>Status</span>
            <strong>Første steg: er det ønsket?</strong>
            <p>Det er ikke fattet noen beslutning, og det er ikke lagt noen konkrete planer.</p>
          </aside>
        </header>

        <blockquote className="mm-highlight">
          <p><strong>Vel'et har lagt tre millioner kroner i lavlandsløypa.</strong> Løypa er mye brukt, som turløype sommer og høst og som skiløype om vinteren. Lys vil gjøre den brukbar også når det er mørkt, men et slikt anlegg er et stort løft som krever godkjenninger og mange bidragsytere.</p>
        </blockquote>

        <section id="bilder" className="lys-block" aria-labelledby="lys-bilder-title">
          <div className="newspaper-kicker">Illustrasjoner</div>
          <h2 id="lys-bilder-title">Slik kan det se ut</h2>
          <p className="lys-intro">Illustrasjonene er laget fra bilder av løypa. Dra i håndtaket for å sammenligne i dag med en kveld med lys.</p>
          <div className="lys-tabs" role="tablist" aria-label="Velg bilde">
            {SCENES.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={i === active} onClick={() => setActive(i)}>{s.label}</button>
            ))}
          </div>
          <BeforeAfter key={scene.id} scene={scene} />
          <p className="lys-caption">Illustrasjonene viser bare stemning og prinsipp. Plassering, antall og utforming av lys er kun et eksempel.</p>
        </section>

        <section className="plansaker-summary" aria-labelledby="lys-type-title">
          <div>
            <div className="newspaper-kicker">Teknologi</div>
            <h2 id="lys-type-title">Hva slags lys?</h2>
          </div>
          <div className="plansaker-point-grid">
            {LIGHT.map((item) => (
              <article className="plansaker-point" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mm-program lys-steps" aria-labelledby="lys-steg-title">
          <div className="newspaper-kicker">Prosess</div>
          <h2 id="lys-steg-title">Veien videre</h2>
          <p className="lys-intro">Dette er ikke noe som kan gjøres raskt. Hvis det er ønske om lysløype, vil prosessen grovt sett se slik ut:</p>
          <ol>
            {STEPS.map((step, i) => (
              <li key={step.title} className={step.now ? 'is-now' : undefined}>
                <time>{i + 1}</time>
                <div>
                  <b>{step.title}{step.now && <em className="lys-now">Nå</em>}</b>
                  <span>
                    {step.now
                      ? <>Saken tas opp på <Link to="/medlemsmote">medlemsmøtet 24. oktober</Link>. Spørsmålet nå er bare om det er interesse for å jobbe videre med dette.</>
                      : step.text}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="plansaker-summary" aria-labelledby="lys-kost-title">
          <div>
            <div className="newspaper-kicker">Finansiering</div>
            <h2 id="lys-kost-title">Hva vil det koste?</h2>
            <p className="lys-big">Millionbeløp</p>
          </div>
          <div className="lys-money">
            <p>Et lysanlegg krever graving, kabel, stolper og strømtilførsel. Selve lampene er som regel ikke den største kostnaden. Hva det vil koste avhenger blant annet av hvor lang strekning som skal lyssettes, men det vil dreie seg om millionbeløp.</p>
            <p><strong>Det er mer enn Kvamskogen Vel kan bære alene, og da må flere bidra.</strong> Mulige bidragsytere:</p>
            <ul>
              {FUNDERS.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </section>

        <section className="lys-cta">
          <h2>Hva mener du?</h2>
          <p>Vil du ha lys på lavlandsløypa på Jonshøgdi/Leite? Kom på medlemsmøtet lørdag 24. oktober kl. 16.00 i Eikedalen og si din mening, eller send inn et innspill til styret på møtesiden.</p>
          <Link className="btn btn-primary" to="/medlemsmote">Meld deg på medlemsmøtet</Link>
        </section>
      </div>
    </section>
  );
};

export default Lysloype;
