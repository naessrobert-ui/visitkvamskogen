import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { moderateMarketplaceListing } from '../lib/marketplace.js';

const ModerateMarketplaceListing = ({ moderation }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Behandler annonsen...');

  useEffect(() => {
    let cancelled = false;

    const moderate = async () => {
      if (!moderation?.listingId || !moderation?.token || !moderation?.action) {
        setStatus('error');
        setMessage('Moderasjonslenken mangler informasjon.');
        return;
      }

      try {
        const result = await moderateMarketplaceListing(moderation);
        if (cancelled) return;
        setStatus('success');
        setMessage(
          result.status === 'published'
            ? 'Annonsen er godkjent og publisert på Kvamskogen Marked.'
            : 'Annonsen er avvist og blir ikke publisert.',
        );
      } catch (_) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Annonsen er allerede behandlet, eller lenken er ugyldig.');
      }
    };

    moderate();
    return () => { cancelled = true; };
  }, [moderation]);

  const heading = status === 'success'
    ? 'Annonse behandlet'
    : status === 'error'
      ? 'Kunne ikke behandle annonsen'
      : 'Behandler annonse';

  return (
    <section className="section organizer-page">
      <div className="container">
        <div className="organizer-panel">
          <div className="success" style={{ padding: 0 }}>
            <div className="icon"><Icon name={status === 'error' ? 'x' : 'check'} size={26} /></div>
            <h1>{heading}</h1>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModerateMarketplaceListing;
