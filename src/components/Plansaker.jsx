import Icon from './Icons.jsx';

const HEARING_POINTS = [
  {
    title: 'Støtter hovedretningen',
    text: 'Kvamskogen Vel mener planforslaget er godt, grundig og konstruktivt, og at det i hovedsak peker i en positiv retning for området.',
  },
  {
    title: 'Vil sikre løyper og grøntdrag',
    text: 'Når senterområder utvikles og noen områder fortettes, må sammenhengende ski- og turløyper få romslige korridorer og ikke bli presset inn mellom tett bebyggelse.',
  },
  {
    title: 'Ber om bedre trafikktrygghet',
    text: 'Hovedvegen deler Kvamskogen. Vel-et ber om trygge og tydelige krysningspunkt, særlig ved løyper, målpunkt og senterområder.',
  },
  {
    title: 'Tar vare på mørket og fjellfølelsen',
    text: 'Innspillet støtter planens fokus på mindre lysforurensing, både av hensyn til naturmangfold, dyreliv og opplevelsen av stjernehimmel.',
  },
];

const HEARING_TEXT = [
  'Kvamskogen Vel viser til framlagt forslag til kommunedelplan for Kvamskogen.',
  'Kvamskogen Vel representerer hytteeiere og eiere av campingvogner på Kvamskogen. Vårt utgangspunkt er at Kvamskogen er et viktig frilufts- og rekreasjonsområde, for dem som har fritidsbolig eller campingvogn i området, og for mange andre brukere i regionen.',
  'Vi ønsker å gi uttrykk for at planen fremstår som god, grundig og gjennomarbeidet. Etter vår vurdering peker planen ut en retning som i hovedsak vil kunne bidra positivt til utviklingen av Kvamskogen. Det er også positivt at Lavlandsløypa og sammenhengende tur- og løypetilbud synes å ha fått en tydelig plass i planarbeidet.',
  'Vi har forståelse for ønsket om å utvikle tydeligere senterområder og samle ny bebyggelse og aktivitet på egnede steder. Dette kan bidra til bedre arealbruk, bedre infrastruktur og et mer helhetlig tilbud på Kvamskogen. Samtidig vil vi understreke at utviklingen av senterområder ikke må skje på en måte som vesentlig svekker de kvalitetene som gjør Kvamskogen attraktivt som fjell- og friluftsområde.',
  'Kvamskogen Vel ser videre at det i planen er temaer som kan berøre prioriteringen mellom biltilkomst, vinterbrøyting og preparerte løyper. Dette er spørsmål hvor våre medlemmer kan ha ulike behov og prioriteringer, blant annet avhengig av beliggenhet, alder, bruksmønster og avstand fra vei. Som organisasjon finner vi det derfor ikke riktig å ta et helt entydig standpunkt i alle slike spørsmål. Vi vil likevel understreke betydningen av at berørte eiere og brukere blir godt involvert når mer konkrete løsninger skal vurderes.',
  'Nettopp fordi bebyggelsen konsentreres og andre områder på Kvamskogen fortettes, er det for Kvamskogen Vel særlig viktig at sammenhengende ski- og turløyper blir hegnet om og ikke forringet som følge av tiltak knyttet til senterutvikling, biltilkomst eller brøyting. Det må alltid sikres gode og romslige korridorer for skiløyper og ferdsel på langs og gjennom områdene. Løypene bør ikke bli så smale, oppstykkede eller så tett omkranset av bebyggelse at brukerne mister opplevelsen av å være i et åpent fjell- og naturområde. Dette er viktig både for trivsel, sikkerhet og for Kvamskogens identitet som friluftsområde.',
  'Vi oppfordrer derfor Kvam herad til å legge stor vekt på løypetraseer, grøntdrag og landskapskvaliteter i det videre arbeidet, særlig i senere detaljreguleringsplaner for senterområdene. Det bør sikres at ny utbygging ikke begrenser de sammenhengende skimulighetene, og at viktige løyper får tilstrekkelig bredde, kvalitet og buffer mot tett bebyggelse.',
  'Et overordnet hensyn for Kvamskogen Vel er trafikktrygghet. Kvamskogen er delt av hovedvegen, og store deler av frilufts- og løypetilbudet forutsetter at brukerne trygt kan ta seg fram på, og krysse mellom, begge sider av vegen. Dette gjelder særlig barn, eldre og skigåere som krysser vegen til og fra løyper og målpunkt. Vi ber derfor om at trafikktrygghet løftes tydelig fram i planen, med konkrete tiltak som trygge og godt merkede krysningspunkt, tilrettelegging for kryssing i tilknytning til løyper og senterområder, og vurdering av fartsgrenser langs de mest brukte strekningene. Det er etter vårt syn avgjørende at begge sider av vegen kan tas i bruk på en trygg og sammenhengende måte.',
  'Vi merker oss også at det i føresegnene er kommet inn punkt om begrensning av lysforurensing, og er positive til at det er satt fokus på dette. Dersom dette blir fulgt opp i planprosesser og i praksis på Kvamskogen, vil det kunne gagne både naturmangfold og dyreliv, og bidra til å ivareta opplevelsen av stjernehimmel på Kvamskogen også i framtiden.',
  'Oppsummert mener Kvamskogen Vel at kommunedelplanen er et godt og konstruktivt grunnlag for videre utvikling av Kvamskogen. Vi støtter hovedretningen i planen, men ber om at hensynet til sammenhengende løyper, trafikktrygghet, friluftsopplevelse og fjellfølelse blir tydelig ivaretatt i den videre planleggingen.',
];

const Plansaker = () => (
  <section className="section plansaker-page">
    <div className="container plansaker-container">
      <header className="plansaker-hero">
        <div>
          <div className="eyebrow spring"><span className="dot"/>Plansaker og høringer</div>
          <h1>Innspill til kommunedelplan for Kvamskogen</h1>
          <p className="lede">
            Kvamskogen Vel støtter hovedretningen i planforslaget, men ber om at løypene, trafikktryggheten og fjellfølelsen får tydelig vern når området utvikles videre.
          </p>
          <div className="plansaker-actions">
            <a className="btn btn-primary" href="/assets/docs/innspill-kommunedelplan-kvamskogen.docx" download>
              <Icon name="download" size={16}/>
              Last ned innspillet
            </a>
            <a className="btn btn-ghost" href="https://www.kvam.no/tenester/planar-og-styrande-dokument/kunngjeringar-og-prosjekt/kommunedelpan-for-kvamskogen-planforslag-til-offentleg-ettersyn.65953.aspx" target="_blank" rel="noopener">
              Kommunens planside
            </a>
          </div>
        </div>
        <aside className="plansaker-status" aria-label="Status for høringsinnspill">
          <span>Høringsinnspill</span>
          <strong>Kvamskogen Vel</strong>
          <p>Publisert på Visit Kvamskogen 13. juni 2026. Dokumentet er lagt ut slik at hyttefolk og andre interesserte raskt kan se hva vel-et har spilt inn.</p>
        </aside>
      </header>

      <section className="plansaker-summary" aria-labelledby="plansaker-summary-title">
        <div>
          <div className="newspaper-kicker">Kort fortalt</div>
          <h2 id="plansaker-summary-title">Dette ber vel-et kommunen passe på</h2>
        </div>
        <div className="plansaker-point-grid">
          {HEARING_POINTS.map((point) => (
            <article key={point.title} className="plansaker-point">
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <article className="plansaker-document" aria-labelledby="plansaker-document-title">
        <div className="newspaper-kicker">Hele teksten</div>
        <h2 id="plansaker-document-title">Innspill til kommunedelplan for Kvamskogen</h2>
        {HEARING_TEXT.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p><strong>Med vennlig hilsen</strong><br/>Styret i Kvamskogen Vel</p>
      </article>
    </div>
  </section>
);

export default Plansaker;
