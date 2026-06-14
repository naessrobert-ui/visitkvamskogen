import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { verifyTrailEmail } from '../lib/trailSuggestions.js';

const VerifyTrailEmail = ({ verification }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Bekrefter turforslaget...');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!verification?.suggestionId || !verification?.token) {
        setStatus('error');
        setMessage('Bekreftelseslenken mangler informasjon.');
        return;
      }

      try {
        const result = await verifyTrailEmail(verification);
        if (cancelled) return;
        setStatus('success');
        setMessage(result?.moderatorNotified === false
          ? 'E-posten er bekreftet, men varsel til administrator kunne ikke sendes automatisk. Ta kontakt med administrator slik at turforslaget kan godkjennes.'
          : 'E-posten er bekreftet. Turforslaget blir gjennomgått av en moderator før det publiseres på Visit Kvamskogen.');
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
            <h1>{status === 'success' ? 'Turforslag bekreftet' : 'Bekrefter turforslag'}</h1>
            <p>{message}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VerifyTrailEmail;
