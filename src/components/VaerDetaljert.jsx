import { useEffect, useRef } from 'react';
import { startVaerside } from '../lib/vaerside.js';
import '../styles/vaerside.css';

// Siden tegnes imperativt (samme kode som prisanalyse.no/ver/varsel), så React
// eier bare beholderen. Tilbakekallene leses via ref for å slippe ny oppstart
// hver gang forelderen rendrer.
const VaerDetaljert = ({ sted, onError, onVelgSted, onAnnetSted }) => {
  const rootRef = useRef(null);
  const cb = useRef({});
  cb.current = { onError, onVelgSted, onAnnetSted };

  useEffect(() => startVaerside(rootRef.current, {
    sted,
    onError: (e) => cb.current.onError?.(e),
    onVelgSted: (id) => cb.current.onVelgSted?.(id),
    onAnnetSted: () => cb.current.onAnnetSted?.(),
  }), [sted]);

  return <div className="vd" ref={rootRef} />;
};

export default VaerDetaljert;
