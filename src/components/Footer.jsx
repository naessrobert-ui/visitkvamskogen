import { Spruce } from './Brand.jsx';
import Icon from './Icons.jsx';
import Link from './Link.jsx';

const Footer = ({ route }) => {
  const isHome = route === 'home';

  return (
    <footer className={"kk-footer" + (isHome ? ' kk-footer-home' : '')}>
      <div className="container">
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, color:'#fff'}}>
            <Spruce size={26} style={{color:'#fff'}}/>
            <span style={{fontFamily:'var(--font-display)', fontSize:24, fontWeight:500, letterSpacing:'-0.01em'}}>Kvamskogen</span>
          </div>
          <p className="blurb">Et hyttelandskap mellom Hardanger og Bergen - drevet på dugnad siden 1971.</p>
          <a className="donate" href="https://www.kvamskogen-vel.no/bli-medlem-2/" target="_blank" rel="noopener"><Icon name="heart" size={14}/> Bli medlem av Kvamskogen Vel</a>
        </div>
        <div>
          <h4>Området</h4>
          <ul>
            <li><Link to="/turforslag">Turforslag</Link></li>
            <li><Link to="/vaer">Vær og føreforhold</Link></li>
            <li><Link to="/skiloyper">Preparerte skiløyper</Link></li>
            <li><Link to="/lavlandsloypen">Lavlandsløypen</Link></li>
            <li><Link to="/webkamera">Webkamera</Link></li>
            <li><Link to="/skisentre">Skisentre</Link></li>
          </ul>
        </div>
        <div>
          <h4>Besøk</h4>
          <ul>
            <li><Link to="/aktiviteter">Aktiviteter</Link></li>
            <li><Link to="/overnatting">Overnatting</Link></li>
            <li><Link to="/marked">Kvamskogen Marked</Link></li>
            <li><Link to="/hardanger">Oppdag Hardanger</Link></li>
            <li><Link to="/praktisk">Praktisk informasjon</Link></li>
          </ul>
        </div>
        <div>
          <h4>For hyttefolk</h4>
          <ul>
            <li><Link to="/loypebidrag">Tilskudd til løypeprep.</Link></li>
            <li><Link to="/tilbud">Kvamskogen Vel</Link></li>
            <li><Link to="/styret">Styret</Link></li>
            <li><Link to="/medlemsmote">Medlemsmøte 24. oktober</Link></li>
            <li><Link to="/medlemsfordeler">Medlemsfordeler</Link></li>
            <li><Link to="/plansaker">Plansaker og høringer</Link></li>
            <li><Link to="/naeringslag">Kvamskogen Næringslag</Link></li>
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
