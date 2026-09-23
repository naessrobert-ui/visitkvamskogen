const PageIntro = ({ eyebrow, title, text }) => (
  <section className="section tight page-intro">
    <div className="container">
      <div className="eyebrow winter" style={{marginBottom:8}}><span className="dot"/>{eyebrow}</div>
      <h1>{title}</h1>
      <p className="lede">{text}</p>
    </div>
  </section>
);

export default PageIntro;
