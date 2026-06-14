import { useEffect, useState } from 'react';
import Icon from './Icons.jsx';
import { moderateTrailSuggestion } from '../lib/trailSuggestions.js';

const ModerateTrailSuggestion = ({ moderation }) => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Behandler turforslaget...');

  useEffect(() => {
    let cancelled = false;

    const moderate = async () => {
      if (!moderation?.suggestionId || !moderation?.token || !moderation?.action) {
        setStatus('error');
        setMessage('Moderasjonslenken mangler informasjon.');
        return;
      }

      try {
        const result = await moderateTrailSuggestion(moderation);
        if (cancelled) return;
        setStatus('success');
        setMessage(
          result.status === 'published'
            ? 'Turforslaget er godkjent og publisert på Visit Kvamskogen.'
            : 'Turforslaget er avvist og blir ikke publisert.',
        );
      } catch (_) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Turforslaget er allerede behandlet, eller lenken er ugyldig.');
      }
    };

    moderate();
    return () => { cancelled = true; };
  }, [moderation]);

  const heading = status === 'success'
    ? 'Turforslag behandlet'
    : status === 'error'
      ? 'Kunne ikke behandle turforslaget'
      : 'Behandler turforslag';

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

export default ModerateTrailSuggestion;
