const YEAR_TILES = [
  { cls:'tile-vinter', eb:'Desember–April', nm:'Skiløyper og toppturer' },
  { cls:'tile-vaar',   eb:'April–Mai',      nm:'Vårski mot Folgefonna' },
  { cls:'tile-sommer', eb:'Juni–August',    nm:'Bading i fjellvann' },
  { cls:'tile-haust',  eb:'September–Oktober', nm:'Klar luft, rolig vann' },
];

const YearStrip = () => (
  <section className="section tight">
    <div className="container">
      <div className="section-head">
        <div className="titles">
          <div className="eyebrow summer"><span className="dot"/>Året rundt</div>
          <h2>Samme sted, fire fortellinger.</h2>
          <p className="lede">Kvamskogen er ikke én sesong. Det er fire — og hver av dem har sine egne løyper, sin egen lyd, sitt eget lys.</p>
        </div>
      </div>
      <div className="year-strip">
        {YEAR_TILES.map((t,i) => (
          <div key={i} className={"year-tile " + t.cls}>
            <div className="label">
              <div className="eb">{t.eb}</div>
              <div className="nm">{t.nm}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const MoodBlock = () => (
  <section className="section tight">
    <div className="container mood-block">
      <div className="mood-photo" style={{backgroundImage:"url('/assets/photos/winter/furedalen-snofall-natt.webp')"}}>
        <div className="cap"><small>Furedalen, januar</small>Det snør ofte. Noen år mer enn andre — og noen år blir hyttene helt nedsnødd.</div>
      </div>
      <div className="mood-photo" style={{backgroundImage:"url('/assets/photos/winter/loypemaskin-natt.webp')"}}>
        <div className="cap"><small>Løypene · natt til søndag</small>Maskinene kjører om natten, slik at det er klart til søndagsturen.</div>
      </div>
    </div>
  </section>
);

export default YearStrip;
