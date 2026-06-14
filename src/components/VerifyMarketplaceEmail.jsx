import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { verifyMarketplaceEmail } from '../lib/marketplace.js';

const VerifyMarketplaceEmail = ({ verification }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Bekrefter annonsen...');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!verification?.listingId || !verification?.token) {
        setStatus('error');
        setMessage('Bekreftelseslenken mangler informasjon.');
        return;
      }

      try {
        const result = await verifyMarketplaceEmail(verification);
        if (cancelled) return;
        setStatus('success');
        setMessage(result?.moderatorNotified === false
          ? 'E-posten er bekreftet, men varsel til administrator kunne ikke sendes automatisk. Ta kontakt med administrator slik at annonsen kan godkjennes.'
          : 'E-posten er bekreftet. Annonsen blir gjennomgått av en moderator før den publiseres på Kvamskogen Marked.');
      } catch (_) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Bekreftelseslenken er ugyldig eller allerede brukt.');
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [verification]);

  return (
    <section className="section organizer-page">
      <div className="container">
        <div className="organizer-panel">
          <div className="success" style={{ padding: 0 }}>
            <div className="icon"><Icon name={status === 'error' ? 'x' : 'check'} size={26} /></div>
            <h1>{status === 'success' ? 'Annonse bekreftet' : 'Bekrefter annonse'}</h1>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyMarketplaceEmail;
