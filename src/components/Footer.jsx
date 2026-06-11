import { Spruce } from './Brand.jsx';
import Icon from './Icons.jsx';

const Footer = ({ onNav, route }) => {
  const isHome = route === 'home';
  const go = (route) => (event) => {
    event.preventDefault();
    onNav(route);
  };

  return (
    <footer className={"kk-footer" + (isHome ? ' kk-footer-home' : '')}>
      <div className="container">
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, color:'#fff'}}>
            <Spruce size={26} style={{color:'#fff'}}/>
            <span style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:500, letterSpacing:'-0.01em'}}>Kvamskogen</span>
          </div>
          <p className="blurb">Et hyttelandskap mellom Hardanger og Bergen — drevet på dugnad siden 1971.</p>
          <a className="donate" href="https://www.kvamskogen-vel.no/bli-medlem-2/" target="_blank" rel="noopener"><Icon name="heart" size={14}/> Bli medlem av Kvamskogen Vel</a>
        </div>
        <div>
          <h4>Området</h4>
          <ul>
            <li><a href="#weather" onClick={go('weather')}>Vær og føreforhold</a></li>
            {!isHome && <li><a href="https://prisanalyse.no/ver/skiloyper-kvamskogen" target="_blank" rel="noopener">Preparerte skiløyper</a></li>}
            <li><a href="#lavlandsloypen" onClick={go('lavlandsloypen')}>Lavlandsløypen</a></li>
            <li><a href="#webkamera" onClick={go('webkamera')}>Webkamera</a></li>
            <li><a href="#marked" onClick={go('marked')}>Kvamskogen Marked</a></li>
            <li><a href="#naeringslag" onClick={go('naeringslag')}>Kvamskogen Næringslag</a></li>
            {!isHome && <li><a href="#skisentre" onClick={go('skisentre')}>Skisentre</a></li>}
            <li><a>Parkering</a></li>
          </ul>
        </div>
        <div>
          <h4>For hyttefolk</h4>
          <ul>
            {!isHome && <li><a href="#loypebidrag" onClick={go('loypebidrag')}>Tilskudd til løypeprep.</a></li>}
            <li><a href="#tilbud" onClick={go('tilbud')}>Dagens tilbud</a></li>
            <li><a href="#plansaker" onClick={go('plansaker')}>Plansaker og høringer</a></li>
            <li><a href="https://www.kvam.no/tenester/planar-og-styrande-dokument/kunngjeringar-og-prosjekt/kommunedelpan-for-kvamskogen-planforslag-til-offentleg-ettersyn.65953.aspx" target="_blank" rel="noopener">Reguleringsplaner</a></li>
          </ul>
        </div>
        <div className="legal">
          <span>© 2026 Kvamskogen Vel</span>
          <span>Org. 971 432 109</span>
          <span style={{marginLeft:'auto'}}>Driftet på dugnad. Foto: lokale fotografer.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
