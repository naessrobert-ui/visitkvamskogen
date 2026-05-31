const HyttefolkPlaceholder = ({ title }) => (
  <section className="section">
    <div className="container" style={{maxWidth:780}}>
      <div className="eyebrow spring"><span className="dot"/>For hyttefolk</div>
      <h2 style={{fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,56px)', fontWeight:500, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 14px'}}>
        {title}
      </h2>
    </div>
  </section>
);

export default HyttefolkPlaceholder;
