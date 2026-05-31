import { useEffect, useState } from 'react';
import { verifyActivityEmail } from '../lib/activities.js';

const VerifyActivityEmail = ({ verification }) => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        await verifyActivityEmail(verification);
        if (!cancelled) setStatus('success');
      } catch (_) {
        if (!cancelled) setStatus('error');
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [verification]);

  return (
    <section className="section organizer-page">
      <div className="container">
        <div className="organizer-header">
          <div className="eyebrow summer"><span className="dot" />E-postbekreftelse</div>
          {status === 'loading' && <h1>Bekrefter aktiviteten...</h1>}
          {status === 'success' && (
            <>
              <h1>Aktiviteten er publisert</h1>
              <p className="lede">Takk. Aktiviteten er nå synlig på aktivitetssiden.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <h1>Lenken virker ikke</h1>
              <p className="lede">Bekreftelseslenken er ugyldig eller aktiviteten er allerede behandlet.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default VerifyActivityEmail;
