import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase.js';
import './poll.css';

const PENDING_KEY = 'vel-pending-poll-v1';
const DEFAULT_OPTIONS = [
  'Ja, dette går vi inn for.',
  'Saken bør behandles på neste styremøte.',
  'Nei, jeg støtter ikke forslaget.',
];

const formatDateTime = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
};

const currentCaseId = () => new URLSearchParams(window.location.search).get('sak');
const currentCaseTitle = () => document.querySelector('.vel-case-header h1')?.textContent?.trim() || '';
const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const PollFormAddon = ({ onDraftChange }) => {
  const [kind, setKind] = useState('discussion');
  const [deadline, setDeadline] = useState('');
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [allowSuggestions, setAllowSuggestions] = useState(true);
  const [formalDecision, setFormalDecision] = useState(true);

  useEffect(() => {
    onDraftChange({ kind, deadline, options, allowSuggestions, formalDecision });
  }, [kind, deadline, options, allowSuggestions, formalDecision, onDraftChange]);

  const updateOption = (index, value) => setOptions((current) => current.map((entry, position) => position === index ? value : entry));
  const removeOption = (index) => setOptions((current) => current.filter((_, position) => position !== index));

  return (
    <fieldset className="vel-poll-create">
      <legend>Type sak</legend>
      <div className="vel-poll-type-row">
        <label className={kind === 'discussion' ? 'is-selected' : ''}>
          <input type="radio" name="vel-case-kind" value="discussion" checked={kind === 'discussion'} onChange={() => setKind('discussion')} />
          <span><b>Diskusjon</b><small>Vanlig sak med kommentarer</small></span>
        </label>
        <label className={kind === 'poll' ? 'is-selected' : ''}>
          <input type="radio" name="vel-case-kind" value="poll" checked={kind === 'poll'} onChange={() => setKind('poll')} />
          <span><b>Avstemming</b><small>Styret stemmer på alternativer</small></span>
        </label>
      </div>
      {kind === 'poll' && <div className="vel-poll-create-fields">
        <label>Frist for å stemme<input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} required /></label>
        <div className="vel-poll-options-editor">
          <div className="vel-poll-options-heading"><b>Svaralternativer</b><small>Minst to alternativer</small></div>
          {options.map((option, index) => <div className="vel-poll-option-edit" key={`${index}-${option.slice(0, 12)}`}>
            <span>{index + 1}</span>
            <input value={option} onChange={(event) => updateOption(index, event.target.value)} required maxLength={240} />
            {options.length > 2 && <button type="button" onClick={() => removeOption(index)} aria-label={`Fjern alternativ ${index + 1}`}>×</button>}
          </div>)}
          <button className="vel-poll-add-option" type="button" onClick={() => setOptions((current) => [...current, ''])}>＋ Legg til alternativ</button>
        </div>
        <label className="vel-poll-check"><input type="checkbox" checked={allowSuggestions} onChange={(event) => setAllowSuggestions(event.target.checked)} /><span><b>Medlemmer kan foreslå egne alternativer</b><small>Forslaget må godkjennes av styreleder før det blir stemmebart.</small></span></label>
        <label className="vel-poll-check"><input type="checkbox" checked={formalDecision} onChange={(event) => setFormalDecision(event.target.checked)} /><span><b>Krever formelt styrevedtak</b><small>Resultatet kan brukes som grunnlag for vedtakstekst.</small></span></label>
        <div className="vel-poll-info">Hvis et nytt alternativ legges til etter at noen har stemt, beholdes de avgitte stemmene. Alle kan endre stemmen sin frem til fristen.</div>
      </div>}
    </fieldset>
  );
};

const PollCard = ({ caseId, onMessage }) => {
  const [poll, setPoll] = useState(null);
  const [options, setOptions] = useState([]);
  const [votes, setVotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    if (!supabase || !caseId) return;
    setLoading(true);
    setError('');
    try {
      const [memberIdResult, pollResult, membersResult] = await Promise.all([
        supabase.rpc('current_vel_member_id'),
        supabase.from('vel_polls').select('*').eq('case_id', caseId).maybeSingle(),
        supabase.from('vel_members').select('id, name, role, is_admin, active').eq('active', true).order('name'),
      ]);
      if (memberIdResult.error) throw memberIdResult.error;
      if (pollResult.error) throw pollResult.error;
      if (membersResult.error) throw membersResult.error;
      const pollItem = pollResult.data || null;
      setPoll(pollItem);
      setMembers(membersResult.data || []);
      setCurrentMember((membersResult.data || []).find((item) => item.id === memberIdResult.data) || null);
      if (!pollItem) {
        setOptions([]);
        setVotes([]);
        return;
      }
      const [optionsResult, votesResult] = await Promise.all([
        supabase.from('vel_poll_options').select('*').eq('poll_id', pollItem.id).order('position').order('created_at'),
        supabase.from('vel_poll_votes').select('*').eq('poll_id', pollItem.id).order('updated_at'),
      ]);
      if (optionsResult.error) throw optionsResult.error;
      if (votesResult.error) throw votesResult.error;
      setOptions(optionsResult.data || []);
      setVotes(votesResult.data || []);
    } catch (_) {
      setError('Avstemmingen kunne ikke lastes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [caseId]);

  const activeOptions = useMemo(() => options.filter((item) => item.status === 'active'), [options]);
  const pendingOptions = useMemo(() => options.filter((item) => item.status === 'pending'), [options]);
  const voteByMember = useMemo(() => new Map(votes.map((vote) => [vote.member_id, vote])), [votes]);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const myVote = currentMember ? voteByMember.get(currentMember.id) : null;
  const deadlinePassed = poll?.deadline ? new Date(poll.deadline).getTime() <= Date.now() : false;
  const isOpen = Boolean(poll && poll.status === 'open' && !deadlinePassed);

  const counts = useMemo(() => activeOptions.map((option) => ({
    option,
    votes: votes.filter((vote) => vote.option_id === option.id),
  })), [activeOptions, votes]);

  const vote = async (optionId) => {
    if (!poll || !currentMember || !isOpen) return;
    setSaving(true); setError('');
    try {
      const result = await supabase.from('vel_poll_votes').upsert({
        poll_id: poll.id,
        option_id: optionId,
        member_id: currentMember.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'poll_id,member_id' });
      if (result.error) throw result.error;
      await load();
      onMessage('Stemmen din er registrert. Du kan endre den frem til fristen.');
    } catch (_) {
      setError('Stemmen kunne ikke lagres. Prøv igjen.');
    } finally { setSaving(false); }
  };

  const suggest = async (event) => {
    event.preventDefault();
    const label = suggestion.trim();
    if (!poll || !currentMember || !label) return;
    setSaving(true); setError('');
    try {
      const nextPosition = Math.max(0, ...options.map((item) => Number(item.position) || 0)) + 10;
      const result = await supabase.from('vel_poll_options').insert({
        poll_id: poll.id,
        label,
        position: nextPosition,
        status: 'pending',
        proposed_by: currentMember.id,
      });
      if (result.error) throw result.error;
      setSuggestion('');
      await load();
      onMessage('Forslaget er sendt inn og venter på godkjenning.');
    } catch (_) {
      setError('Forslaget kunne ikke lagres.');
    } finally { setSaving(false); }
  };

  const approve = async (option) => {
    if (!currentMember?.is_admin) return;
    setSaving(true); setError('');
    try {
      const result = await supabase.rpc('approve_vel_poll_option', { p_option_id: option.id });
      if (result.error) throw result.error;
      await load();
      onMessage('Alternativet er lagt til. Tidligere stemmer er beholdt, og alle kan endre stemmen frem til fristen.');
    } catch (_) {
      setError('Alternativet kunne ikke godkjennes.');
    } finally { setSaving(false); }
  };

  const reject = async (option) => {
    if (!currentMember?.is_admin) return;
    setSaving(true); setError('');
    try {
      const result = await supabase.rpc('reject_vel_poll_option', { p_option_id: option.id });
      if (result.error) throw result.error;
      await load();
      onMessage('Alternativet er avvist.');
    } catch (_) {
      setError('Alternativet kunne ikke avvises.');
    } finally { setSaving(false); }
  };

  const resultText = useMemo(() => {
    if (!poll || !poll.formal_decision || !deadlinePassed || !votes.length || !counts.length) return '';
    const sorted = [...counts].sort((a, b) => b.votes.length - a.votes.length);
    if (sorted.length > 1 && sorted[0].votes.length === sorted[1].votes.length) return `Avstemmingen er avsluttet med ${votes.length} avgitte stemmer. Resultatet er uavgjort.`;
    return `Avstemmingen er avsluttet med ${votes.length} avgitte stemmer. Alternativet «${sorted[0].option.label}» fikk flest stemmer (${sorted[0].votes.length}).`;
  }, [poll, deadlinePassed, votes, counts]);

  const copyResult = async () => {
    if (!resultText) return;
    await navigator.clipboard?.writeText(resultText);
    onMessage('Forslag til vedtakstekst er kopiert.');
  };

  if (loading) return <section className="vel-poll-card is-loading"><span>Henter avstemming…</span></section>;
  if (!poll) return null;

  return <section className="vel-poll-card">
    <header className="vel-poll-card-header">
      <div><p>AVSTEMMING</p><h2>Hva mener styret?</h2><span>{poll.deadline ? `Svarfrist ${formatDateTime(poll.deadline)}` : 'Ingen svarfrist satt'}</span></div>
      <span className={`vel-poll-state ${isOpen ? 'is-open' : 'is-closed'}`}>{isOpen ? 'Åpen' : 'Avsluttet'}</span>
    </header>
    <div className="vel-poll-progress"><b>{votes.length} av {members.length}</b><span>har stemt</span><div><i style={{ width: `${members.length ? Math.min(100, votes.length / members.length * 100) : 0}%` }} /></div></div>
    <div className="vel-poll-options">
      {counts.map(({ option, votes: optionVotes }) => {
        const selected = myVote?.option_id === option.id;
        return <button className={`vel-poll-option ${selected ? 'is-selected' : ''}`} key={option.id} type="button" disabled={!isOpen || saving} onClick={() => vote(option.id)}>
          <span className="vel-poll-radio">{selected ? '✓' : ''}</span>
          <span className="vel-poll-option-copy"><b>{option.label}</b><small>{optionVotes.length ? optionVotes.map((entry) => memberById.get(entry.member_id)?.name || 'Styremedlem').join(', ') : 'Ingen stemmer ennå'}</small></span>
          <strong>{optionVotes.length}</strong>
        </button>;
      })}
    </div>
    {isOpen && <div className="vel-poll-vote-note">Stemmegivningen er åpen og ikke anonym. Du kan endre stemmen din frem til fristen.</div>}
    {!isOpen && <div className="vel-poll-vote-note is-closed">Avstemmingen er avsluttet. Resultatet og hvem som stemte hva, blir stående i saken.</div>}
    {pendingOptions.length > 0 && <section className="vel-poll-pending">
      <header><b>Foreslåtte alternativer</b><small>Disse kan ikke stemmes på før de er godkjent.</small></header>
      {pendingOptions.map((option) => <article key={option.id}>
        <div><b>{option.label}</b><small>Foreslått av {memberById.get(option.proposed_by)?.name || 'styremedlem'}</small></div>
        {currentMember?.is_admin && <span><button type="button" disabled={saving} onClick={() => approve(option)}>Legg til</button><button className="is-reject" type="button" disabled={saving} onClick={() => reject(option)}>Avvis</button></span>}
      </article>)}
    </section>}
    {poll.allow_suggestions && isOpen && <form className="vel-poll-suggest" onSubmit={suggest}>
      <label>Foreslå et annet alternativ<input value={suggestion} onChange={(event) => setSuggestion(event.target.value)} placeholder="Skriv et alternativ…" maxLength={240} required /></label>
      <button type="submit" disabled={saving || !suggestion.trim()}>Send forslag</button>
    </form>}
    {resultText && <section className="vel-poll-decision"><div><p>FORSLAG TIL VEDTAKSTEKST</p><span>{resultText}</span></div><button type="button" onClick={copyResult}>Kopier</button></section>}
    {error && <p className="vel-poll-error">{error}</p>}
  </section>;
};

const PollEnhancer = () => {
  const [available, setAvailable] = useState(false);
  const [formHost, setFormHost] = useState(null);
  const [detailHost, setDetailHost] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [message, setMessage] = useState('');
  const draftRef = useRef({ kind: 'discussion' });

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const check = async (session) => {
      if (!active || !session) { if (active) setAvailable(false); return; }
      const result = await supabase.from('vel_polls').select('id').limit(1);
      if (active) setAvailable(!result.error);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => window.setTimeout(() => check(session), 0));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!available) { setFormHost(null); setDetailHost(null); return undefined; }
    const scan = () => {
      const modal = [...document.querySelectorAll('.vel-modal')].find((node) => node.querySelector('#vel-modal-title')?.textContent?.trim() === 'Ny sak');
      const form = modal?.querySelector('form.vel-form') || null;
      let nextFormHost = form?.querySelector('#vel-poll-form-host') || null;
      if (form && !nextFormHost) {
        nextFormHost = document.createElement('div');
        nextFormHost.id = 'vel-poll-form-host';
        const firstFieldset = form.querySelector('fieldset');
        if (firstFieldset) form.insertBefore(nextFormHost, firstFieldset); else form.appendChild(nextFormHost);
      }
      setFormHost((current) => current === nextFormHost ? current : nextFormHost);

      const nextCaseId = currentCaseId();
      setCaseId((current) => current === nextCaseId ? current : nextCaseId);
      const detailMain = nextCaseId ? document.querySelector('.vel-detail-main') : null;
      let nextDetailHost = detailMain?.querySelector('#vel-poll-detail-host') || null;
      if (detailMain && !nextDetailHost) {
        nextDetailHost = document.createElement('div');
        nextDetailHost.id = 'vel-poll-detail-host';
        const contentCard = detailMain.querySelector('.vel-content-card');
        if (contentCard?.nextSibling) detailMain.insertBefore(nextDetailHost, contentCard.nextSibling); else detailMain.appendChild(nextDetailHost);
      }
      setDetailHost((current) => current === nextDetailHost ? current : nextDetailHost);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [available]);

  useEffect(() => {
    if (!formHost) return undefined;
    const form = formHost.closest('form');
    if (!form) return undefined;
    const remember = () => {
      const draft = draftRef.current;
      if (draft.kind !== 'poll') {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }
      const title = form.querySelector('input[maxlength="160"]')?.value || '';
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...draft, caseTitle: normalize(title), savedAt: Date.now() }));
    };
    form.addEventListener('submit', remember, true);
    return () => form.removeEventListener('submit', remember, true);
  }, [formHost]);

  useEffect(() => {
    if (!available || !caseId || !supabase) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    let pending;
    try { pending = JSON.parse(raw); } catch (_) { sessionStorage.removeItem(PENDING_KEY); return; }
    if (pending.kind !== 'poll' || Date.now() - Number(pending.savedAt || 0) > 10 * 60 * 1000) { sessionStorage.removeItem(PENDING_KEY); return; }

    let cancelled = false;
    const create = async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      if (cancelled || (pending.caseTitle && normalize(currentCaseTitle()) !== pending.caseTitle)) return;
      const existing = await supabase.from('vel_polls').select('id').eq('case_id', caseId).maybeSingle();
      if (existing.error) return;
      if (existing.data) { sessionStorage.removeItem(PENDING_KEY); return; }
      const cleanOptions = (pending.options || []).map((entry) => normalize(entry)).filter(Boolean);
      const result = await supabase.rpc('create_vel_poll', {
        p_case_id: caseId,
        p_deadline: pending.deadline ? new Date(pending.deadline).toISOString() : null,
        p_allow_suggestions: Boolean(pending.allowSuggestions),
        p_formal_decision: Boolean(pending.formalDecision),
        p_options: cleanOptions,
      });
      if (cancelled) return;
      if (result.error) {
        setMessage('Saken ble opprettet, men avstemmingen kunne ikke lagres.');
        return;
      }
      sessionStorage.removeItem(PENDING_KEY);
      setMessage('Saken og avstemmingen er publisert.');
      const host = document.querySelector('#vel-poll-detail-host');
      if (host) setDetailHost(host);
    };
    create();
    return () => { cancelled = true; };
  }, [available, caseId]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return <>
    {formHost && createPortal(<PollFormAddon onDraftChange={(draft) => { draftRef.current = draft; }} />, formHost)}
    {detailHost && caseId && createPortal(<PollCard caseId={caseId} onMessage={setMessage} />, detailHost)}
    {message && createPortal(<div className="vel-poll-toast" role="status">{message}</div>, document.body)}
  </>;
};

export default PollEnhancer;
