import { useEffect, useMemo, useState } from 'react';
import {
  createVelCase, createVelComment, createVelMeeting, createVelMember, createVelTask, getVelSession,
  hasSupabaseConfig, loadCurrentVelMember, loadVelWorkspace, notifyVelImportant,
  onVelAuthChange, openVelAttachment, openVelDocument, sendVelLogin, setVelTaskComplete,
  signOutVel, updateVelCase, updateVelMeeting, updateVelMember, uploadVelDocument, verifyVelLoginCode,
} from './velApi.js';
import { DOCUMENT_THEME_ICONS, DOCUMENT_THEMES, documentMetadata, MEETING_DOCUMENT_TYPES } from './documentMetadata.js';

const STATUS_LABELS = { open: 'Åpen', in_progress: 'Til behandling', decided: 'Vedtatt', deferred: 'Utsatt', done: 'Ferdig' };
const MEMBER_ROLES = ['Styremedlem', 'Varamedlem', 'Styreleder', 'Nestleder', 'Kasserer'];
const EMAIL_STATUS_LABELS = { accepted: 'Godtatt av e-posttjenesten', partial: 'Delvis sendt', failed: 'Utsending feilet' };
const EMPTY_WORKSPACE = { members: [], adminMembers: [], notifications: [], meetings: [], cases: [], comments: [], tasks: [], attachments: [], documents: [] };
const formatDate = (value, options = {}) => {
  if (!value) return '';
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return new Intl.DateTimeFormat('no-NO', options).format(date);
};
const shortDate = (value) => formatDate(value, { day: 'numeric', month: 'short' });
const longDate = (value) => formatDate(value, { day: 'numeric', month: 'long', year: 'numeric' });
const dateTime = (value) => formatDate(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const caseDate = (value) => formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
const caseCommentTime = (value) => `${caseDate(value)} kl. ${formatDate(value, { hour: '2-digit', minute: '2-digit' })}`;
const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const formatFileSize = (size) => {
  if (!Number.isFinite(Number(size))) return '';
  if (Number(size) >= 1024 ** 3) return `${(Number(size) / 1024 ** 3).toFixed(1).replace('.', ',')} GB`;
  if (Number(size) >= 1024 ** 2) return `${(Number(size) / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${Math.round(Number(size) / 1024)} kB`;
};
const documentDateValue = (item) => {
  if (item.document_date) return new Date(`${item.document_date}T12:00:00`).getTime();
  if (item.source_modified_at) return new Date(item.source_modified_at).getTime();
  return 0;
};
const sortDocuments = (items, sort) => [...items].sort((a, b) => {
  if (sort === 'name') return a.file_name.localeCompare(b.file_name, 'no');
  const dateDifference = documentDateValue(a) - documentDateValue(b);
  if (dateDifference) return sort === 'date-asc' ? dateDifference : -dateDifference;
  return a.file_name.localeCompare(b.file_name, 'no');
});
const groupDocumentsByYear = (items, sort) => {
  const groups = new Map();
  items.forEach((item) => {
    const year = documentMetadata(item).documentYear;
    const key = year || 'uten-år';
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.entries()]
    .sort(([yearA], [yearB]) => {
      if (yearA === 'uten-år') return 1;
      if (yearB === 'uten-år') return -1;
      return sort === 'date-asc' ? Number(yearA) - Number(yearB) : Number(yearB) - Number(yearA);
    })
    .map(([year, documents]) => ({ year, documents: sortDocuments(documents, sort) }));
};
const suggestedDocumentFolder = ({ theme, documentType, documentYear }) => {
  const year = documentYear || new Date().getFullYear();
  if (theme === 'Møter') return `${year}/Møter/${documentType || 'Andre møter'}`;
  if (theme === 'Prosjekter og parkering') return `${year}/Prosjekter`;
  if (theme === 'Økonomi') return `${year}/Økonomi`;
  if (theme === 'Styring og rutiner') return `${year}/Styrende dokumenter`;
  if (theme === 'Kommunikasjon') return `${year}/Kommunikasjon`;
  return `${year}/Annet`;
};
const todayInput = () => new Date().toISOString().slice(0, 10);
const latestCaseComment = (item, maps) => (maps.commentsByCase.get(item.id) || []).at(-1) || null;
const sortCasesByActivity = (items, maps) => [...items].sort((a, b) => {
  const activityA = latestCaseComment(a, maps)?.created_at || a.created_at;
  const activityB = latestCaseComment(b, maps)?.created_at || b.created_at;
  return new Date(activityB).getTime() - new Date(activityA).getTime();
});

const Modal = ({ title, children, onClose }) => (
  <div className="vel-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="vel-modal" role="dialog" aria-modal="true" aria-labelledby="vel-modal-title">
      <header><h2 id="vel-modal-title">{title}</h2><button type="button" onClick={onClose} aria-label="Lukk">×</button></header>
      {children}
    </section>
  </div>
);

const LoginScreen = ({ configured, onSend, onVerify }) => {
  const openedFromCodeEmail = new URLSearchParams(window.location.search).get('kode') === '1';
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState(openedFromCodeEmail ? 'code' : 'link');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(openedFromCodeEmail);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSending(true); setError('');
    const requestedMode = event.nativeEvent.submitter?.value === 'code' ? 'code' : 'link';
    try { await onSend(email, requestedMode); setMode(requestedMode); setSent(true); } catch (_) { setError('Kunne ikke sende innloggingen. Prøv igjen om litt.'); } finally { setSending(false); }
  };
  const verify = async (event) => {
    event.preventDefault(); setVerifying(true); setError('');
    try { await onVerify(email, code); } catch (_) { setError('Koden er ugyldig eller utløpt. Be om en ny kode og prøv igjen.'); } finally { setVerifying(false); }
  };
  const reset = () => {
    window.history.replaceState(null, '', window.location.pathname);
    setSent(false); setMode('link'); setCode(''); setError('');
  };
  return (
    <main className="vel-login-page">
      <section className="vel-login-card">
        <a className="vel-login-brand" href="/"><img src="/assets/logos/kvamskogen-vel.png" alt="Kvamskogen Vel" /><span>Digitalt styrerom</span></a>
        <div className="vel-login-copy"><p className="vel-kicker">KUN FOR STYRET</p><h1>Alt styrearbeidet<br />på ett sted.</h1><p>Saker, møteagendaer, vedtak og oppgaver – trygt samlet for styremedlemmer og varamedlemmer.</p></div>
        {!configured ? <div className="vel-auth-message is-error">Styrerommet er bygget, men må kobles til databasen før det kan tas i bruk.</div> : sent && mode === 'code' ? (
          <div className="vel-code-login">
            <div className="vel-auth-message"><strong>Skriv inn koden</strong><span>{email ? `Vi har sendt en engangskode til ${email}.` : 'Oppgi samme e-postadresse som koden ble sendt til.'} Knappen i e-posten bruker ikke opp koden.</span></div>
            <form className="vel-login-form" onSubmit={verify}><label>E-postadresse<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="navn@eksempel.no" required autoComplete="email" /></label><label>Engangskode<input className="vel-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" minLength={6} maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="8-sifret kode" required autoFocus={Boolean(email)} /></label>{error && <p className="vel-form-error">{error}</p>}<button className="vel-primary vel-login-button" disabled={verifying || code.length < 6} type="submit">{verifying ? 'Logger inn…' : 'Logg inn med kode'} <span>→</span></button><button className="vel-login-alternative" type="button" onClick={reset}>Tilbake til vanlig innlogging</button></form>
          </div>
        ) : sent ? (
          <div className="vel-auth-message"><strong>Sjekk innboksen din</strong><span>Vi har sendt en innloggingslenke til {email}. Lenken kan bare brukes én gang.</span><button type="button" onClick={reset}>Bruk en annen e-postadresse</button></div>
        ) : (
          <form className="vel-login-form" onSubmit={submit}><label>E-postadresse<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="navn@eksempel.no" required autoComplete="email" /></label>{error && <p className="vel-form-error">{error}</p>}<button className="vel-primary vel-login-button" disabled={sending} name="mode" value="link" type="submit">{sending ? 'Sender…' : 'Send meg innloggingslenke'} <span>→</span></button><button className="vel-login-alternative" disabled={sending} name="mode" value="code" type="submit">Jobb-PC? Bruk engangskode</button><small>Bare forhåndsgodkjente styre- og varamedlemmer får tilgang.</small></form>
        )}
        <a className="vel-login-back" href="/">← Tilbake til Visit Kvamskogen</a>
      </section>
      <aside className="vel-login-aside" aria-hidden="true"><div><span>KVAMSKOGEN VEL</span><strong>Styret 2026</strong></div></aside>
    </main>
  );
};

const AccessDenied = ({ email, onSignOut }) => <main className="vel-state-page"><img src="/assets/logos/kvamskogen-vel.png" alt="Kvamskogen Vel" /><p className="vel-kicker">TILGANG MANGLER</p><h1>Denne e-postadressen er ikke invitert</h1><p>{email} finnes ikke i den aktive styrelisten. Kontakt styreleder dersom dette er feil.</p><button className="vel-primary" type="button" onClick={onSignOut}>Logg ut og prøv igjen</button></main>;
const LoadingScreen = () => <main className="vel-state-page"><div className="vel-loader" /><p>Åpner styrerommet…</p></main>;

const CaseForm = ({ meetings, defaultMeetingId = '', onClose, onSubmit }) => {
  const [values, setValues] = useState({ title: '', description: '', priority: 'normal', meetingId: defaultMeetingId });
  const [file, setFile] = useState(null); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onSubmit(values, file); onClose(); } catch (_) { setError('Saken kunne ikke lagres. Kontroller feltene og prøv igjen.'); } finally { setSaving(false); } };
  return <form className="vel-form" onSubmit={submit}>
    <label>Tittel<input value={values.title} onChange={set('title')} placeholder="Hva gjelder saken?" required maxLength={160} /></label>
    <label>Beskrivelse<textarea value={values.description} onChange={set('description')} placeholder="Bakgrunn, forslag og det styret bør ta stilling til…" rows={6} required /></label>
    <fieldset><legend>Prioritet</legend><div className="vel-choice-row"><label className={values.priority === 'normal' ? 'is-selected' : ''}><input type="radio" name="priority" value="normal" checked={values.priority === 'normal'} onChange={set('priority')} /><span><b>Normal</b><small>Vises i styrerommet</small></span></label><label className={values.priority === 'important' ? 'is-selected important' : ''}><input type="radio" name="priority" value="important" checked={values.priority === 'important'} onChange={set('priority')} /><span><b>Viktig</b><small>E-post til hele styret</small></span></label></div></fieldset>
    <label>Behandles på styremøte<select value={values.meetingId} onChange={set('meetingId')}><option value="">Ikke bestemt</option>{meetings.map((meeting) => <option key={meeting.id} value={meeting.id}>{meeting.title} – {shortDate(meeting.meeting_date)}</option>)}</select></label>
    <label className="vel-file-field">Vedlegg<input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span>{file ? file.name : 'Velg PDF, bilde eller dokument'}</span></label>
    {values.priority === 'important' && <div className="vel-important-note">Alle aktive styre- og varamedlemmer får e-post når saken publiseres.</div>}{error && <p className="vel-form-error">{error}</p>}
    <footer><button type="button" className="vel-quiet-button" onClick={onClose}>Avbryt</button><button className="vel-primary" disabled={saving} type="submit">{saving ? 'Lagrer…' : 'Publiser sak'}</button></footer>
  </form>;
};

const MeetingForm = ({ initialMeeting = null, onClose, onSubmit }) => {
  const [values, setValues] = useState({
    title: initialMeeting?.title || 'Styremøte',
    date: initialMeeting?.meeting_date || '',
    time: initialMeeting?.meeting_time?.slice(0, 5) || '18:00',
    location: initialMeeting?.location || 'Kvamskogen / Teams',
    deadline: initialMeeting?.agenda_deadline || '',
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onSubmit(values); onClose(); } catch (_) { setError('Møtet kunne ikke lagres. Prøv igjen.'); } finally { setSaving(false); } };
  return <form className="vel-form" onSubmit={submit}><label>Navn på møtet<input value={values.title} onChange={set('title')} required maxLength={160} /></label><div className="vel-form-grid"><label>Dato<input type="date" min={initialMeeting ? undefined : todayInput()} value={values.date} onChange={set('date')} required /></label><label>Tid<input type="time" value={values.time} onChange={set('time')} /></label></div><label>Sted<input value={values.location} onChange={set('location')} placeholder="Møterom eller videolenke" /></label><label>Frist for å melde saker<input type="date" value={values.deadline} onChange={set('deadline')} max={values.date || undefined} /></label>{error && <p className="vel-form-error">{error}</p>}<footer><button type="button" className="vel-quiet-button" onClick={onClose}>Avbryt</button><button className="vel-primary" disabled={saving} type="submit">{saving ? 'Lagrer…' : initialMeeting ? 'Lagre endringer' : 'Opprett møte'}</button></footer></form>;
};

const TaskForm = ({ members, onSubmit }) => {
  const [values, setValues] = useState({ title: '', responsibleId: members[0]?.id || '', dueDate: '' }); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { await onSubmit(values); setValues((current) => ({ ...current, title: '', dueDate: '' })); } catch (_) { setError('Oppgaven kunne ikke lagres.'); } finally { setSaving(false); } };
  return <form className="vel-task-form" onSubmit={submit}><input aria-label="Oppgave" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} placeholder="Ny oppgave…" required /><select aria-label="Ansvarlig" value={values.responsibleId} onChange={(event) => setValues((current) => ({ ...current, responsibleId: event.target.value }))} required>{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><input aria-label="Frist" type="date" value={values.dueDate} onChange={(event) => setValues((current) => ({ ...current, dueDate: event.target.value }))} /><button className="vel-secondary-dark" disabled={saving} type="submit">{saving ? 'Lagrer…' : 'Legg til'}</button>{error && <p className="vel-form-error">{error}</p>}</form>;
};

const MemberForm = ({ initialMember = null, currentMember, onClose, onSubmit }) => {
  const isSelf = initialMember?.id === currentMember.id;
  const [values, setValues] = useState({
    name: initialMember?.name || '',
    email: initialMember?.email || '',
    role: initialMember?.role || 'Styremedlem',
    isAdmin: initialMember?.is_admin || false,
    active: initialMember?.active ?? true,
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSubmit(values); onClose(); } catch (submitError) { setError(submitError?.code === '23505' ? 'E-postadressen er allerede registrert.' : 'Medlemmet kunne ikke lagres. Kontroller opplysningene og prøv igjen.'); } finally { setSaving(false); }
  };
  const roles = MEMBER_ROLES.includes(values.role) ? MEMBER_ROLES : [values.role, ...MEMBER_ROLES];
  return <form className="vel-form" onSubmit={submit}>
    <label>Navn<input value={values.name} onChange={set('name')} placeholder="Fornavn og etternavn" required maxLength={120} autoComplete="name" /></label>
    <label>E-postadresse<input type="email" value={values.email} onChange={set('email')} placeholder="navn@eksempel.no" required maxLength={254} autoComplete="email" disabled={isSelf} />{isSelf && <small className="vel-field-help">Din egen e-post kan ikke endres mens du er innlogget.</small>}</label>
    <label>Rolle<select value={values.role} onChange={set('role')}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
    <label className="vel-check-field"><input type="checkbox" checked={values.isAdmin} onChange={set('isAdmin')} disabled={isSelf} /><span><b>Administrator</b><small>Kan legge til og endre styremedlemmer.</small></span></label>
    {error && <p className="vel-form-error">{error}</p>}
    <footer><button type="button" className="vel-quiet-button" onClick={onClose}>Avbryt</button><button className="vel-primary" disabled={saving} type="submit">{saving ? 'Lagrer…' : initialMember ? 'Lagre medlem' : 'Legg til medlem'}</button></footer>
  </form>;
};

const DocumentForm = ({ folders, onClose, onSubmit }) => {
  const currentYear = new Date().getFullYear();
  const [values, setValues] = useState({
    folderPath: `${currentYear}/Møter/Styremøter`,
    theme: 'Møter',
    documentType: 'Styremøter',
    documentYear: String(currentYear),
    documentDate: '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const setClassification = (changes) => setValues((current) => {
    const next = { ...current, ...changes };
    return { ...next, folderPath: suggestedDocumentFolder(next) };
  });
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSubmit(values, file); onClose(); } catch (submitError) {
      setError(submitError?.message?.includes('15 MB') ? submitError.message : 'Dokumentet kunne ikke lastes opp. Det kan allerede finnes en fil med samme navn i mappen.');
    } finally { setSaving(false); }
  };
  return <form className="vel-form" onSubmit={submit}>
    <div className="vel-form-grid"><label>Tema<select value={values.theme} onChange={(event) => setClassification({ theme: event.target.value })}>{DOCUMENT_THEMES.map((theme) => <option key={theme} value={theme}>{theme}</option>)}</select></label><label>År<input type="number" min="1900" max="2200" value={values.documentYear} onChange={(event) => setClassification({ documentYear: event.target.value })} required /></label></div>
    {values.theme === 'Møter' && <label>Møtetype<select value={values.documentType} onChange={(event) => setClassification({ documentType: event.target.value })}>{MEETING_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>}
    <label><span>Dokumentdato <small className="vel-label-optional">(valgfritt)</small></span><input type="date" value={values.documentDate} onChange={(event) => setClassification({ documentDate: event.target.value, documentYear: event.target.value?.slice(0, 4) || values.documentYear })} /><small className="vel-field-help">Bruk datoen i selve dokumentet når den er kjent.</small></label>
    <label>Mappe<input list="vel-document-folders" value={values.folderPath} onChange={set('folderPath')} placeholder="For eksempel 2026/Møter/Styremøter" required maxLength={500} /><datalist id="vel-document-folders">{folders.map((folder) => <option key={folder} value={folder} />)}</datalist><small className="vel-field-help">Original mappesti beholdes som ekstra informasjon.</small></label>
    <label className="vel-file-field">Dokument<input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><span>{file ? `${file.name} · ${formatFileSize(file.size)}` : 'Velg dokument (maks. 15 MB)'}</span></label>
    {error && <p className="vel-form-error">{error}</p>}
    <footer><button type="button" className="vel-quiet-button" onClick={onClose}>Avbryt</button><button className="vel-primary" disabled={saving || !file} type="submit">{saving ? 'Laster opp…' : 'Last opp'}</button></footer>
  </form>;
};

const DocumentRow = ({ item, onOpen, review = false }) => {
  const metadata = documentMetadata(item);
  const primaryDate = item.document_date
    ? formatDate(item.document_date, { day: 'numeric', month: 'short' })
    : metadata.documentYear || 'Ukjent';
  const secondaryDate = item.document_date
    ? String(metadata.documentYear || '')
    : item.source_modified_at
      ? `Endret ${formatDate(item.source_modified_at, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : 'År fra mappe';
  const content = <>
    <span className="vel-document-date"><b>{primaryDate}</b><small title={item.source_modified_at ? 'Sist endret i OneDrive' : undefined}>{secondaryDate}</small></span>
    <span className="vel-document-icon">{review ? '!' : '▤'}</span>
    <span className="vel-document-copy"><b>{item.file_name}</b><small>{metadata.documentType ? `${metadata.documentType} · ` : ''}{item.folder_path || 'Uten mappe'}</small></span>
    <span className="vel-document-size">{formatFileSize(item.file_size)}</span>
    {review ? <em>Vurderes</em> : <i>Åpne →</i>}
  </>;
  return review
    ? <article>{content}</article>
    : <button type="button" onClick={() => onOpen(item.storage_path)}>{content}</button>;
};

const DocumentYearGroups = ({ items, onOpen, review, sort }) => groupDocumentsByYear(items, sort).map((group) => (
  <section className="vel-document-year" key={group.year}>
    <header><h3>{group.year === 'uten-år' ? 'Uten år' : group.year}</h3><span>{group.documents.length} {group.documents.length === 1 ? 'dokument' : 'dokumenter'}</span></header>
    <div className="vel-document-list">{group.documents.map((item) => <DocumentRow key={item.id} item={item} onOpen={onOpen} review={review} />)}</div>
  </section>
));

const DocumentsView = ({ documents, onOpen, onUpload }) => {
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState('');
  const [meetingType, setMeetingType] = useState('');
  const [sort, setSort] = useState('date-desc');
  const themeCounts = useMemo(() => Object.fromEntries(DOCUMENT_THEMES.map((entry) => [entry, documents.filter((item) => documentMetadata(item).theme === entry).length])), [documents]);
  const normalizedQuery = query.trim().toLocaleLowerCase('no');
  const filtered = documents.filter((item) => {
    const metadata = documentMetadata(item);
    const searchable = `${item.file_name} ${item.folder_path || ''} ${item.search_text || ''} ${metadata.theme} ${metadata.documentType || ''} ${metadata.documentYear || ''}`.toLocaleLowerCase('no');
    return (!theme || metadata.theme === theme)
      && (!meetingType || metadata.documentType === meetingType)
      && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
  const available = filtered.filter((item) => item.migration_status === 'available');
  const review = filtered.filter((item) => item.migration_status !== 'available');
  return <section className="vel-view vel-documents-view">
    <header className="vel-view-header"><div><p className="vel-kicker">PRIVAT DOKUMENTARKIV</p><h1>Dokumenter</h1><span>{documents.filter((item) => item.migration_status === 'available').length} dokumenter er tilgjengelige i styrerommet.</span></div><button className="vel-primary" type="button" onClick={onUpload}>＋ Last opp</button></header>
    <section className="vel-document-themes"><header><div><p className="vel-kicker">VELG TEMA</p><h2>{theme || 'Hele arkivet'}</h2></div>{theme && <button type="button" onClick={() => { setTheme(''); setMeetingType(''); }}>Vis alle</button>}</header><div>{DOCUMENT_THEMES.map((entry) => <button className={theme === entry ? 'is-active' : ''} key={entry} type="button" onClick={() => { setTheme(entry); setMeetingType(''); }}><span>{DOCUMENT_THEME_ICONS[entry]}</span><b>{entry}</b><small>{themeCounts[entry]} dokumenter</small></button>)}</div></section>
    {theme === 'Møter' && <div className="vel-document-subtypes"><button className={!meetingType ? 'is-active' : ''} type="button" onClick={() => setMeetingType('')}>Alle møter</button>{MEETING_DOCUMENT_TYPES.map((type) => <button className={meetingType === type ? 'is-active' : ''} key={type} type="button" onClick={() => setMeetingType(type)}>{type}</button>)}</div>}
    <div className="vel-document-tools"><label className="vel-document-search"><span>⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk etter dokument eller mappe…" /></label><select aria-label="Sorter dokumenter" value={sort} onChange={(event) => setSort(event.target.value)}><option value="date-desc">Nyeste dato først</option><option value="date-asc">Eldste dato først</option><option value="name">Navn A–Å</option></select></div>
    <section className="vel-document-section"><header><div><p className="vel-kicker">KLAR TIL BRUK</p><h2>{available.length} dokumenter</h2></div><span>Gruppert etter år. «Endret» viser siste endring i OneDrive.</span></header>{available.length ? <DocumentYearGroups items={available} onOpen={onOpen} sort={sort} /> : <div className="vel-empty"><strong>Ingen dokumenter funnet</strong><span>Prøv et annet søk eller tema.</span></div>}</section>
    {review.length > 0 && <section className="vel-document-section vel-document-review"><header><div><p className="vel-kicker">TIL VURDERING</p><h2>{review.length} store dokumenter</h2></div><span>Disse er over 15 MB og er ikke kopiert inn ennå.</span></header><DocumentYearGroups items={review} review sort={sort} /></section>}
  </section>;
};

const CaseRow = ({ item, comments, author, meeting, onOpen }) => {
  const lastComment = comments.at(-1) || null;
  return <button className={`vel-case ${item.priority === 'important' ? 'vel-important' : ''}`} type="button" onClick={onOpen}><span className="vel-case-icon">{item.priority === 'important' ? '!' : initials(author?.name || 'KV')}</span><span className="vel-case-copy"><span className={`vel-tag ${item.priority === 'important' ? '' : 'vel-tag-normal'}`}>{item.priority === 'important' ? 'VIKTIG' : 'NORMAL'}</span><b>{item.title}</b><small>{meeting ? `${meeting.title} · ` : ''}{comments.length} {comments.length === 1 ? 'kommentar' : 'kommentarer'} · {STATUS_LABELS[item.status]}</small><span className="vel-case-dates"><span>Lagt ut {caseDate(item.created_at)}</span><span>{lastComment ? `Siste kommentar ${caseCommentTime(lastComment.created_at)}` : 'Ingen kommentarer ennå'}</span></span></span><span className="vel-arrow">→</span></button>;
};
const TaskRow = ({ task, responsible, caseItem, onToggle }) => {
  const overdue = task.due_date && !task.completed && task.due_date < todayInput();
  return <label className={`vel-task-row ${task.completed ? 'is-complete' : ''}`}><input type="checkbox" checked={task.completed} onChange={(event) => onToggle(task.id, event.target.checked)} /><span><b>{task.title}</b><small>{responsible?.name || 'Uten ansvarlig'}{task.due_date ? ` · Frist ${shortDate(task.due_date)}` : ''}{caseItem ? ` · ${caseItem.title}` : ''}</small></span>{overdue && <em>Forfalt</em>}</label>;
};

const Dashboard = ({ member, workspace, maps, nextMeeting, onOpenCase, onOpenMeeting, onNewCase, onToggleTask, onView }) => {
  const recentCases = sortCasesByActivity(workspace.cases, maps).slice(0, 4); const myTasks = workspace.tasks.filter((task) => task.responsible_id === member.id && !task.completed).slice(0, 5); const agendaCount = nextMeeting ? workspace.cases.filter((item) => item.meeting_id === nextMeeting.id).length : 0;
  const dayName = new Intl.DateTimeFormat('no-NO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
  return <><section className="vel-heading"><div><p>{dayName}</p><h1>Hei, {member.name.split(' ')[0]}</h1><span>Her er det viktigste i styrearbeidet nå.</span></div><button className="vel-primary" type="button" onClick={onNewCase}><span>＋</span> Ny sak</button></section>
    {nextMeeting ? <button className="vel-meeting-card" type="button" onClick={() => onOpenMeeting(nextMeeting.id)}><span className="vel-date"><strong>{String(new Date(`${nextMeeting.meeting_date}T12:00:00`).getDate()).padStart(2, '0')}</strong><span>{formatDate(nextMeeting.meeting_date, { month: 'short' }).toUpperCase()}</span></span><span className="vel-meeting-copy"><span>NESTE STYREMØTE</span><b>{nextMeeting.title}</b><small>{longDate(nextMeeting.meeting_date)}{nextMeeting.meeting_time ? ` kl. ${nextMeeting.meeting_time.slice(0, 5)}` : ''}{nextMeeting.location ? ` · ${nextMeeting.location}` : ''}</small></span><span className="vel-meeting-count"><strong>{agendaCount}</strong><small>saker på agendaen</small></span><span className="vel-secondary">Se møte <i>→</i></span></button> : <section className="vel-empty-banner"><div><p className="vel-kicker">STYREMØTER</p><h2>Ingen kommende møter ennå</h2><span>Opprett et møte, så kan sakene legges rett på agendaen.</span></div><button className="vel-secondary-dark" type="button" onClick={() => onView('meetings')}>Opprett møte</button></section>}
    <div className="vel-grid"><section className="vel-panel"><header><div><p>SAKER</p><h2>Siste aktivitet</h2></div><button type="button" onClick={() => onView('cases')}>Se alle</button></header>{recentCases.length ? recentCases.map((item) => <CaseRow key={item.id} item={item} author={maps.members.get(item.created_by)} meeting={maps.meetings.get(item.meeting_id)} comments={maps.commentsByCase.get(item.id) || []} onOpen={() => onOpenCase(item.id)} />) : <div className="vel-empty"><strong>Ingen saker ennå</strong><span>Trykk «Ny sak» for å starte den første diskusjonen.</span></div>}</section><section className="vel-panel vel-tasks"><header><div><p>MINE OPPGAVER</p><h2>Det du følger opp</h2></div><span className="vel-count">{myTasks.length}</span></header>{myTasks.length ? myTasks.map((task) => <TaskRow key={task.id} task={task} responsible={member} caseItem={maps.cases.get(task.case_id)} onToggle={onToggleTask} />) : <div className="vel-empty"><strong>Alt er fulgt opp</strong><span>Du har ingen åpne oppgaver.</span></div>}<button className="vel-task-add" type="button" onClick={() => onView('tasks')}>Se alle oppgaver</button></section></div></>;
};

const CasesView = ({ workspace, maps, onOpenCase, onNewCase }) => {
  const [filter, setFilter] = useState('open'); const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('no-NO');
  const cases = sortCasesByActivity(workspace.cases.filter((item) => {
    if (filter !== 'all' && (filter === 'important' ? item.priority !== 'important' : item.status === 'done')) return false;
    if (!normalizedQuery) return true;
    const comments = maps.commentsByCase.get(item.id) || [];
    const searchable = [item.title, item.description, STATUS_LABELS[item.status], maps.meetings.get(item.meeting_id)?.title, ...comments.map((entry) => entry.body)].filter(Boolean).join(' ').toLocaleLowerCase('no-NO');
    return searchable.includes(normalizedQuery);
  }), maps);
  return <section className="vel-view"><header className="vel-view-header"><div><p className="vel-kicker">SAKSLISTE</p><h1>Styrets saker</h1><span>Nyeste aktivitet vises først.</span></div><button className="vel-primary" type="button" onClick={onNewCase}>＋ Ny sak</button></header><div className="vel-case-tools"><div className="vel-filters"><button className={filter === 'open' ? 'is-active' : ''} onClick={() => setFilter('open')}>Aktive</button><button className={filter === 'important' ? 'is-active' : ''} onClick={() => setFilter('important')}>Viktige</button><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Alle</button></div><label className="vel-case-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søk i saker og kommentarer" aria-label="Søk i saker og kommentarer" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Tøm søket">×</button>}</label></div><div className="vel-list-card">{cases.length ? cases.map((item) => <CaseRow key={item.id} item={item} author={maps.members.get(item.created_by)} meeting={maps.meetings.get(item.meeting_id)} comments={maps.commentsByCase.get(item.id) || []} onOpen={() => onOpenCase(item.id)} />) : <div className="vel-empty"><strong>{normalizedQuery ? 'Ingen saker passer med søket' : 'Ingen saker i denne visningen'}</strong><span>{normalizedQuery ? 'Prøv et annet søkeord eller velg et annet filter.' : 'Velg et annet filter eller opprett en ny sak.'}</span></div>}</div></section>;
};

const MeetingsView = ({ workspace, maps, onOpenMeeting, onNewMeeting }) => <section className="vel-view"><header className="vel-view-header"><div><p className="vel-kicker">STYREMØTER</p><h1>Møter og agenda</h1><span>Sakene bygger agendaen automatisk.</span></div><button className="vel-primary" type="button" onClick={onNewMeeting}>＋ Nytt møte</button></header><div className="vel-meeting-list">{workspace.meetings.length ? workspace.meetings.map((meeting) => { const count = maps.casesByMeeting.get(meeting.id)?.length || 0; return <button key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}><span className="vel-date"><strong>{String(new Date(`${meeting.meeting_date}T12:00:00`).getDate()).padStart(2, '0')}</strong><span>{formatDate(meeting.meeting_date, { month: 'short' }).toUpperCase()}</span></span><span><b>{meeting.title}</b><small>{longDate(meeting.meeting_date)}{meeting.meeting_time ? ` kl. ${meeting.meeting_time.slice(0, 5)}` : ''}{meeting.location ? ` · ${meeting.location}` : ''}</small></span><em>{count} {count === 1 ? 'sak' : 'saker'}</em><i>→</i></button>; }) : <div className="vel-empty"><strong>Ingen møter er opprettet</strong><span>Opprett neste styremøte for å begynne å samle agendaen.</span></div>}</div></section>;

const MeetingDetail = ({ meeting, cases, maps, canEdit, onBack, onEdit, onOpenCase, onNewCase }) => <section className="vel-view vel-detail"><button className="vel-back-button" type="button" onClick={onBack}>← Alle møter</button><header className="vel-detail-header"><div className="vel-date vel-date-large"><strong>{String(new Date(`${meeting.meeting_date}T12:00:00`).getDate()).padStart(2, '0')}</strong><span>{formatDate(meeting.meeting_date, { month: 'short' }).toUpperCase()}</span></div><div><p className="vel-kicker">STYREMØTE</p><h1>{meeting.title}</h1><span>{longDate(meeting.meeting_date)}{meeting.meeting_time ? ` kl. ${meeting.meeting_time.slice(0, 5)}` : ''}{meeting.location ? ` · ${meeting.location}` : ''}</span>{meeting.agenda_deadline && <small>Frist for å melde saker: {longDate(meeting.agenda_deadline)}</small>}</div><div className="vel-detail-actions">{canEdit && <button className="vel-secondary-dark" type="button" onClick={onEdit}>Rediger møte</button>}<button className="vel-primary" type="button" onClick={onNewCase}>＋ Meld inn sak</button></div></header><section className="vel-agenda"><header><p className="vel-kicker">AGENDA</p><h2>{cases.length + 3} punkter</h2></header><ol><li className="vel-agenda-fixed"><span>1</span><b>Godkjenning av innkalling</b></li><li className="vel-agenda-fixed"><span>2</span><b>Godkjenning av forrige referat</b></li>{cases.map((item, index) => <li key={item.id}><button type="button" onClick={() => onOpenCase(item.id)}><span>{index + 3}</span><span><small className={item.priority === 'important' ? 'is-important' : ''}>{item.priority === 'important' ? 'VIKTIG' : STATUS_LABELS[item.status]}</small><b>{item.title}</b><em>{maps.commentsByCase.get(item.id)?.length || 0} kommentarer</em></span><i>→</i></button></li>)}<li className="vel-agenda-fixed"><span>{cases.length + 3}</span><b>Eventuelt</b></li></ol></section></section>;

const TasksView = ({ workspace, maps, onToggleTask }) => { const [filter, setFilter] = useState('open'); const tasks = workspace.tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.completed : !task.completed)); return <section className="vel-view"><header className="vel-view-header"><div><p className="vel-kicker">OPPFØLGING</p><h1>Oppgaver</h1><span>Ansvar og frister fra styrets saker og vedtak.</span></div></header><div className="vel-filters"><button className={filter === 'open' ? 'is-active' : ''} onClick={() => setFilter('open')}>Åpne</button><button className={filter === 'done' ? 'is-active' : ''} onClick={() => setFilter('done')}>Ferdige</button><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Alle</button></div><div className="vel-list-card vel-task-list">{tasks.length ? tasks.map((task) => <TaskRow key={task.id} task={task} responsible={maps.members.get(task.responsible_id)} caseItem={maps.cases.get(task.case_id)} onToggle={onToggleTask} />) : <div className="vel-empty"><strong>Ingen oppgaver her</strong><span>Oppgaver opprettes inne på en sak.</span></div>}</div></section>; };

const MembersView = ({ members, currentMember, onNewMember, onEditMember, onToggleMember, onEmailLog }) => {
  const [filter, setFilter] = useState('active');
  const visibleMembers = members.filter((person) => filter === 'all' || (filter === 'active' ? person.active : !person.active));
  return <section className="vel-view"><header className="vel-view-header"><div><p className="vel-kicker">ADMINISTRASJON</p><h1>Styremedlemmer</h1><span>Disse e-postadressene kan logge inn i det lukkede styrerommet.</span></div><div className="vel-view-actions"><button className="vel-secondary-dark" type="button" onClick={onEmailLog}>E-postlogg</button><button className="vel-primary" type="button" onClick={onNewMember}>＋ Nytt medlem</button></div></header><div className="vel-filters"><button className={filter === 'active' ? 'is-active' : ''} onClick={() => setFilter('active')}>Aktive</button><button className={filter === 'inactive' ? 'is-active' : ''} onClick={() => setFilter('inactive')}>Inaktive</button><button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Alle</button></div><div className="vel-member-list">{visibleMembers.length ? visibleMembers.map((person) => { const isSelf = person.id === currentMember.id; return <article className={`vel-member-row ${person.active ? '' : 'is-inactive'}`} key={person.id}><span className="vel-avatar vel-member-avatar">{initials(person.name)}</span><div className="vel-member-copy"><span><b>{person.name}</b>{isSelf && <em>Deg</em>}{person.is_admin && <em className="is-admin">Administrator</em>}</span><small>{person.role}</small><a href={`mailto:${person.email}`}>{person.email}</a></div><div className="vel-member-actions"><button className="vel-quiet-button" type="button" onClick={() => onEditMember(person)}>Rediger</button><button className="vel-secondary-dark" type="button" onClick={() => onToggleMember(person)} disabled={isSelf}>{person.active ? 'Deaktiver' : 'Aktiver'}</button></div></article>; }) : <div className="vel-empty"><strong>Ingen medlemmer her</strong><span>Velg et annet filter eller legg til et nytt medlem.</span></div>}</div><p className="vel-member-note">Deaktiverte medlemmer mister innloggingen, men tidligere saker, kommentarer og oppgaver beholdes.</p></section>;
};

const EmailLogView = ({ notifications, maps, onBack, onOpenCase }) => <section className="vel-view"><button className="vel-back-button" type="button" onClick={onBack}>← Styremedlemmer</button><header className="vel-view-header vel-email-header"><div><p className="vel-kicker">ADMINISTRASJON</p><h1>E-postlogg</h1><span>Varsler som er sendt om viktige saker.</span></div></header><div className="vel-email-info"><b>Hva betyr «sendt»?</b><span>Loggen bekrefter at e-posttjenesten har godtatt utsendingen. Mottakerens e-postleverandør kan fortsatt legge meldingen i søppelpost.</span></div><div className="vel-email-log">{notifications.length ? notifications.map((entry) => { const caseItem = maps.cases.get(entry.case_id); const status = entry.delivery_status || 'accepted'; const recipients = entry.recipient_emails || []; const failedRecipients = entry.failed_recipient_emails || []; const subject = entry.subject || `Viktig sak: ${caseItem?.title || 'Styresak'}`; const legacy = !entry.body_text; const body = entry.body_text || `Dette er en eldre utsending der selve e-postkopien ikke ble lagret.\n\nSak: ${caseItem?.title || 'Ukjent sak'}\n\n${caseItem?.description || ''}`; return <details className={`vel-email-entry is-${status}`} key={entry.id}><summary><span className="vel-email-icon">✉</span><span className="vel-email-summary"><small>{dateTime(entry.sent_at)}</small><b>{subject}</b><em>{entry.recipient_count} {entry.recipient_count === 1 ? 'mottaker' : 'mottakere'}</em></span><span className="vel-email-status">{EMAIL_STATUS_LABELS[status] || status}</span><i>⌄</i></summary><div className="vel-email-copy"><dl><div><dt>Mottakere</dt><dd>{recipients.length ? recipients.join(', ') : `${entry.recipient_count} mottakere – adressene ble ikke lagret for eldre utsendinger.`}</dd></div>{failedRecipients.length > 0 && <div className="is-failed"><dt>Ikke godtatt</dt><dd>{failedRecipients.join(', ')}</dd></div>}<div><dt>Emne</dt><dd>{subject}</dd></div></dl><h2>Kopi av innholdet</h2>{legacy && <p className="vel-email-legacy">Denne utsendingen ble gjort før innholdskopier ble slått på. Saksinnholdet vises i stedet.</p>}<pre>{body}</pre>{caseItem && <button className="vel-secondary-dark" type="button" onClick={() => onOpenCase(caseItem.id)}>Åpne saken</button>}</div></details>; }) : <div className="vel-empty"><strong>Ingen e-poster er logget ennå</strong><span>Når en viktig sak varsles, vises utsendingen her.</span></div>}</div></section>;

const CaseDetail = ({ item, workspace, maps, onBack, onSave, onComment, onTask, onToggleTask, onOpenMeeting, onOpenAttachment }) => {
  const [meta, setMeta] = useState({ priority: item.priority, status: item.status, meetingId: item.meeting_id || '', decision: item.decision || '' }); const [comment, setComment] = useState(''); const [commentFile, setCommentFile] = useState(null); const [saving, setSaving] = useState(false); const [commenting, setCommenting] = useState(false); const [error, setError] = useState('');
  const author = maps.members.get(item.created_by); const meeting = maps.meetings.get(item.meeting_id); const comments = maps.commentsByCase.get(item.id) || []; const tasks = maps.tasksByCase.get(item.id) || []; const caseAttachments = (maps.attachmentsByCase.get(item.id) || []).filter((attachment) => !attachment.comment_id);
  useEffect(() => setMeta({ priority: item.priority, status: item.status, meetingId: item.meeting_id || '', decision: item.decision || '' }), [item]);
  const save = async () => { setSaving(true); setError(''); try { await onSave(item, meta); } catch (_) { setError('Endringene kunne ikke lagres.'); } finally { setSaving(false); } };
  const submitComment = async (event) => { event.preventDefault(); if (!comment.trim()) return; const form = event.currentTarget; setCommenting(true); setError(''); try { await onComment(item.id, comment, commentFile); setComment(''); setCommentFile(null); form.reset(); } catch (_) { setError('Kommentaren kunne ikke lagres.'); } finally { setCommenting(false); } };
  return <section className="vel-view vel-detail"><button className="vel-back-button" type="button" onClick={onBack}>← Til saksliste</button><header className="vel-case-header"><div><span className={`vel-tag vel-tag-large ${item.priority === 'important' ? '' : 'vel-tag-normal'}`}>{item.priority === 'important' ? 'VIKTIG' : 'NORMAL'}</span><h1>{item.title}</h1><p>Opprettet av {author?.name || 'styret'} · {dateTime(item.created_at)}</p></div><span className={`vel-status vel-status-${item.status}`}>{STATUS_LABELS[item.status]}</span></header><div className="vel-detail-grid"><div className="vel-detail-main"><article className="vel-content-card"><p className="vel-case-description">{item.description}</p>{caseAttachments.length > 0 && <div className="vel-attachments"><h3>Vedlegg</h3>{caseAttachments.map((attachment) => <button key={attachment.id} type="button" onClick={() => onOpenAttachment(attachment.storage_path)}><span>↳</span><b>{attachment.file_name}</b><small>{attachment.file_size ? `${Math.max(1, Math.round(attachment.file_size / 1024))} kB` : ''}</small></button>)}</div>}</article><section className="vel-comments"><header><p className="vel-kicker">DISKUSJON</p><h2>{comments.length} {comments.length === 1 ? 'kommentar' : 'kommentarer'}</h2></header>{comments.map((entry) => { const person = maps.members.get(entry.author_id); const files = maps.attachmentsByComment.get(entry.id) || []; return <article key={entry.id}><span className="vel-avatar">{initials(person?.name)}</span><div><header><b>{person?.name || 'Styremedlem'}</b><time>{dateTime(entry.created_at)}</time></header><p>{entry.body}</p>{files.map((attachment) => <button className="vel-inline-attachment" key={attachment.id} type="button" onClick={() => onOpenAttachment(attachment.storage_path)}>↳ {attachment.file_name}</button>)}</div></article>; })}{!comments.length && <div className="vel-empty vel-empty-comments"><strong>Ingen kommentarer ennå</strong><span>Start diskusjonen nedenfor.</span></div>}<form className="vel-comment-form" onSubmit={submitComment}><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} placeholder="Skriv en kommentar…" required /><div><label>↳ Legg ved fil<input type="file" onChange={(event) => setCommentFile(event.target.files?.[0] || null)} /></label>{commentFile && <span>{commentFile.name}</span>}<button className="vel-primary" disabled={commenting} type="submit">{commenting ? 'Publiserer…' : 'Publiser'}</button></div></form></section></div><aside className="vel-detail-aside"><section className="vel-side-card"><h2>Behandling</h2><label>Status<select value={meta.status} onChange={(event) => setMeta((current) => ({ ...current, status: event.target.value }))}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Prioritet<select value={meta.priority} onChange={(event) => setMeta((current) => ({ ...current, priority: event.target.value }))}><option value="normal">Normal</option><option value="important">Viktig – varsle alle</option></select></label><label>Styremøte<select value={meta.meetingId} onChange={(event) => setMeta((current) => ({ ...current, meetingId: event.target.value }))}><option value="">Ikke bestemt</option>{workspace.meetings.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} – {shortDate(entry.meeting_date)}</option>)}</select></label>{meeting && <button className="vel-meeting-link" type="button" onClick={() => onOpenMeeting(meeting.id)}>Se agenda for møtet →</button>}<label>Konklusjon / vedtak<textarea rows={5} value={meta.decision} onChange={(event) => setMeta((current) => ({ ...current, decision: event.target.value }))} placeholder="Skriv styrets konklusjon eller vedtak…" /></label>{error && <p className="vel-form-error">{error}</p>}<button className="vel-primary vel-full-button" disabled={saving} type="button" onClick={save}>{saving ? 'Lagrer…' : 'Lagre behandling'}</button></section><section className="vel-side-card"><header><h2>Oppgaver</h2><span className="vel-count">{tasks.filter((task) => !task.completed).length}</span></header>{tasks.map((task) => <TaskRow key={task.id} task={task} responsible={maps.members.get(task.responsible_id)} onToggle={onToggleTask} />)}<TaskForm members={workspace.members} onSubmit={(values) => onTask(item.id, values)} /></section></aside></div></section>;
};

const VelApp = () => {
  const [authState, setAuthState] = useState(hasSupabaseConfig ? 'loading' : 'signed-out'); const [session, setSession] = useState(null); const [member, setMember] = useState(null); const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE); const [loadingData, setLoadingData] = useState(false); const [view, setView] = useState('dashboard'); const [selectedCaseId, setSelectedCaseId] = useState(null); const [selectedMeetingId, setSelectedMeetingId] = useState(null); const [modal, setModal] = useState(null); const [notice, setNotice] = useState('');
  const refresh = async (isAdmin = member?.is_admin || false) => { setLoadingData(true); try { setWorkspace(await loadVelWorkspace({ includeInactiveMembers: isAdmin })); } finally { setLoadingData(false); } };
  useEffect(() => { if (!hasSupabaseConfig) return undefined; let active = true; getVelSession().then((current) => { if (active) setSession(current); }).catch(() => { if (active) setAuthState('signed-out'); }); const { data } = onVelAuthChange((current) => setSession(current)); return () => { active = false; data.subscription.unsubscribe(); }; }, []);
  useEffect(() => { if (!hasSupabaseConfig) return; if (!session) { setMember(null); setAuthState('signed-out'); return; } let active = true; setAuthState('loading'); loadCurrentVelMember().then(async (currentMember) => { if (!active) return; if (!currentMember) { setAuthState('denied'); return; } setMember(currentMember); setAuthState('ready'); await refresh(currentMember.is_admin); }).catch(() => { if (active) setAuthState('denied'); }); return () => { active = false; }; }, [session]);
  useEffect(() => { if (authState !== 'ready' || !workspace.cases.length) return; const caseId = new URLSearchParams(window.location.search).get('sak'); if (caseId && workspace.cases.some((item) => item.id === caseId)) { setSelectedCaseId(caseId); setView('case'); } }, [authState, workspace.cases.length]);
  const maps = useMemo(() => { const group = (items, key) => items.reduce((result, item) => result.set(item[key], [...(result.get(item[key]) || []), item]), new Map()); return { members: new Map([...workspace.adminMembers, ...workspace.members].map((item) => [item.id, item])), meetings: new Map(workspace.meetings.map((item) => [item.id, item])), cases: new Map(workspace.cases.map((item) => [item.id, item])), commentsByCase: group(workspace.comments, 'case_id'), tasksByCase: group(workspace.tasks, 'case_id'), casesByMeeting: group(workspace.cases.filter((item) => item.meeting_id), 'meeting_id'), attachmentsByCase: group(workspace.attachments, 'case_id'), attachmentsByComment: group(workspace.attachments.filter((item) => item.comment_id), 'comment_id') }; }, [workspace]);
  const nextMeeting = useMemo(() => [...workspace.meetings].filter((meeting) => meeting.meeting_date >= todayInput()).sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0] || null, [workspace.meetings]);
  const navigate = (nextView) => { setView(nextView); setSelectedCaseId(null); setSelectedMeetingId(null); window.history.replaceState({}, '', '/vel/'); };
  const openCase = (id) => { setSelectedCaseId(id); setView('case'); window.history.replaceState({}, '', `/vel/?sak=${encodeURIComponent(id)}`); };
  const openMeeting = (id) => { setSelectedMeetingId(id); setView('meeting'); window.history.replaceState({}, '', '/vel/'); };
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 5000); };
  const handleCreateCase = async (values, file) => { const { caseItem, attachmentWarning } = await createVelCase({ values, memberId: member.id, file }); await refresh(); openCase(caseItem.id); if (values.priority === 'important') { try { await notifyVelImportant(caseItem.id, 'created-important'); if (member.is_admin) await refresh(true); flash(attachmentWarning ? 'Saken og e-postvarselet er sendt, men vedlegget kunne ikke lastes opp.' : 'Saken er publisert, og e-post er sendt til styret.'); } catch (_) { if (member.is_admin) await refresh(true); flash(attachmentWarning ? 'Saken er publisert, men vedlegg og e-postvarsel feilet.' : 'Saken er publisert, men e-postvarselet kunne ikke sendes.'); } } else flash(attachmentWarning ? 'Saken er publisert, men vedlegget kunne ikke lastes opp.' : 'Saken er publisert.'); };
  const handleCreateMeeting = async (values) => { const created = await createVelMeeting({ values, memberId: member.id }); await refresh(); openMeeting(created.id); flash('Styremøtet er opprettet.'); };
  const handleUpdateMeeting = async (meetingItem, values) => { await updateVelMeeting(meetingItem.id, values); await refresh(); flash('Møteopplysningene er lagret.'); };
  const handleUpdateCase = async (item, values) => { await updateVelCase(item.id, values); await refresh(); if (item.priority !== 'important' && values.priority === 'important') { try { await notifyVelImportant(item.id, 'escalated-important'); if (member.is_admin) await refresh(true); flash('Endringene er lagret, og e-post er sendt til styret.'); } catch (_) { if (member.is_admin) await refresh(true); flash('Endringene er lagret, men e-postvarselet kunne ikke sendes.'); } } else flash('Endringene er lagret.'); };
  const handleComment = async (caseId, body, file) => { const { attachmentWarning } = await createVelComment({ caseId, memberId: member.id, body, file }); await refresh(); if (attachmentWarning) flash('Kommentaren er publisert, men vedlegget kunne ikke lastes opp.'); };
  const handleTask = async (caseId, values) => { await createVelTask({ caseId, values, memberId: member.id }); await refresh(); };
  const handleToggleTask = async (taskId, completed) => { await setVelTaskComplete(taskId, completed); await refresh(); };
  const handleCreateMember = async (values) => { await createVelMember(values); await refresh(true); flash('Medlemmet er lagt til og kan nå be om innloggingslenke.'); };
  const handleUpdateMember = async (person, values) => { await updateVelMember(person.id, values); await refresh(true); if (person.id === member.id) setMember((current) => ({ ...current, name: values.name, role: values.role })); flash('Medlemsopplysningene er lagret.'); };
  const handleToggleMember = async (person) => { await updateVelMember(person.id, { name: person.name, email: person.email, role: person.role, isAdmin: person.is_admin, active: !person.active }); await refresh(true); flash(person.active ? 'Medlemmet er deaktivert.' : 'Medlemmet er aktivert og kan logge inn igjen.'); };
  const handleUploadDocument = async (values, file) => { await uploadVelDocument({ memberId: member.id, file, ...values }); await refresh(member.is_admin); flash('Dokumentet er lastet opp og er tilgjengelig for styret.'); };
  const handleOpenDocument = async (storagePath) => { try { await openVelDocument(storagePath); } catch (_) { flash('Dokumentet kunne ikke åpnes. Prøv igjen.'); } };
  const handleSignOut = async () => { await signOutVel(); setWorkspace(EMPTY_WORKSPACE); navigate('dashboard'); };
  if (authState === 'loading') return <LoadingScreen />; if (authState === 'signed-out') return <LoginScreen configured={hasSupabaseConfig} onSend={sendVelLogin} onVerify={verifyVelLoginCode} />; if (authState === 'denied') return <AccessDenied email={session?.user?.email || ''} onSignOut={handleSignOut} />; if (!member) return <LoadingScreen />;
  const selectedCase = maps.cases.get(selectedCaseId); const selectedMeeting = maps.meetings.get(selectedMeetingId);
  return (
    <div className="vel-app">
      <header className="vel-topbar">
        <a className="vel-brand" href="/" aria-label="Til Visit Kvamskogen"><img src="/assets/logos/kvamskogen-vel.png" alt="" /><span><b>Kvamskogen Vel</b><small>Digitalt styrerom</small></span></a>
        <div className="vel-top-actions">
          {loadingData && <span className="vel-sync">Oppdaterer…</span>}
          {member.is_admin && <button className={`vel-admin-shortcut ${view === 'members' || view === 'emails' ? 'is-active' : ''}`} type="button" onClick={() => navigate('members')}><span>♙</span>Styret</button>}
          <button className="vel-profile" type="button" onClick={handleSignOut} title="Logg ut"><span>{initials(member.name)}</span><b>{member.name.split(' ')[0]}</b><small>Logg ut</small></button>
        </div>
      </header>
      <div className="vel-layout">
        <aside className="vel-sidebar" aria-label="Hovedmeny">
          <nav>
            <button className={view === 'dashboard' ? 'is-active' : ''} onClick={() => navigate('dashboard')}><span>⌂</span>Oversikt</button>
            <button className={view === 'cases' || view === 'case' ? 'is-active' : ''} onClick={() => navigate('cases')}><span>≡</span>Saker</button>
            <button className={view === 'meetings' || view === 'meeting' ? 'is-active' : ''} onClick={() => navigate('meetings')}><span>□</span>Styremøter</button>
            <button className={view === 'tasks' ? 'is-active' : ''} onClick={() => navigate('tasks')}><span>✓</span>Oppgaver</button>
            <button className={view === 'documents' ? 'is-active' : ''} onClick={() => navigate('documents')}><span>▤</span>Dokumenter</button>
            {member.is_admin && <button className={view === 'members' ? 'is-active' : ''} onClick={() => navigate('members')}><span>♙</span>Styremedlemmer</button>}
            {member.is_admin && <button className={view === 'emails' ? 'is-active' : ''} onClick={() => navigate('emails')}><span>✉</span>E-postlogg</button>}
          </nav>
          <a className="vel-back" href="/">← Visit Kvamskogen</a>
        </aside>
        <main className="vel-main">
          {view === 'dashboard' && <Dashboard member={member} workspace={workspace} maps={maps} nextMeeting={nextMeeting} onOpenCase={openCase} onOpenMeeting={openMeeting} onNewCase={() => setModal({ type: 'case' })} onToggleTask={handleToggleTask} onView={navigate} />}
          {view === 'cases' && <CasesView workspace={workspace} maps={maps} onOpenCase={openCase} onNewCase={() => setModal({ type: 'case' })} />}
          {view === 'meetings' && <MeetingsView workspace={workspace} maps={maps} onOpenMeeting={openMeeting} onNewMeeting={() => setModal({ type: 'meeting' })} />}
          {view === 'tasks' && <TasksView workspace={workspace} maps={maps} onToggleTask={handleToggleTask} />}
          {view === 'documents' && <DocumentsView documents={workspace.documents} onOpen={handleOpenDocument} onUpload={() => setModal({ type: 'document' })} />}
          {view === 'members' && member.is_admin && <MembersView members={workspace.adminMembers} currentMember={member} onNewMember={() => setModal({ type: 'member' })} onEditMember={(person) => setModal({ type: 'member', member: person })} onToggleMember={handleToggleMember} onEmailLog={() => navigate('emails')} />}
          {view === 'emails' && member.is_admin && <EmailLogView notifications={workspace.notifications} maps={maps} onBack={() => navigate('members')} onOpenCase={openCase} />}
          {view === 'case' && selectedCase && <CaseDetail item={selectedCase} workspace={workspace} maps={maps} onBack={() => navigate('cases')} onSave={handleUpdateCase} onComment={handleComment} onTask={handleTask} onToggleTask={handleToggleTask} onOpenMeeting={openMeeting} onOpenAttachment={openVelAttachment} />}
          {view === 'meeting' && selectedMeeting && <MeetingDetail meeting={selectedMeeting} cases={maps.casesByMeeting.get(selectedMeeting.id) || []} maps={maps} canEdit={member.is_admin} onBack={() => navigate('meetings')} onEdit={() => setModal({ type: 'meeting', meeting: selectedMeeting })} onOpenCase={openCase} onNewCase={() => setModal({ type: 'case', meetingId: selectedMeeting.id })} />}
        </main>
      </div>
      <nav className="vel-mobile-nav" aria-label="Mobilmeny">
        <button className={view === 'dashboard' ? 'is-active' : ''} onClick={() => navigate('dashboard')}><span>⌂</span>Oversikt</button>
        <button className={view === 'cases' || view === 'case' ? 'is-active' : ''} onClick={() => navigate('cases')}><span>≡</span>Saker</button>
        <button className="vel-mobile-add" onClick={() => setModal({ type: 'case' })} aria-label="Ny sak">＋</button>
        <button className={view === 'meetings' || view === 'meeting' ? 'is-active' : ''} onClick={() => navigate('meetings')}><span>□</span>Møter</button>
        <button className={view === 'tasks' ? 'is-active' : ''} onClick={() => navigate('tasks')}><span>✓</span>Oppgaver</button>
        <button className={view === 'documents' ? 'is-active' : ''} onClick={() => navigate('documents')}><span>▤</span>Arkiv</button>
      </nav>
      {notice && <div className="vel-notice" role="status">{notice}</div>}
      {modal?.type === 'case' && <Modal title="Ny sak" onClose={() => setModal(null)}><CaseForm meetings={workspace.meetings} defaultMeetingId={modal.meetingId || ''} onClose={() => setModal(null)} onSubmit={handleCreateCase} /></Modal>}
      {modal?.type === 'meeting' && <Modal title={modal.meeting ? 'Rediger styremøte' : 'Nytt styremøte'} onClose={() => setModal(null)}><MeetingForm initialMeeting={modal.meeting} onClose={() => setModal(null)} onSubmit={(values) => modal.meeting ? handleUpdateMeeting(modal.meeting, values) : handleCreateMeeting(values)} /></Modal>}
      {modal?.type === 'member' && <Modal title={modal.member ? 'Rediger medlem' : 'Nytt medlem'} onClose={() => setModal(null)}><MemberForm initialMember={modal.member} currentMember={member} onClose={() => setModal(null)} onSubmit={(values) => modal.member ? handleUpdateMember(modal.member, values) : handleCreateMember(values)} /></Modal>}
      {modal?.type === 'document' && <Modal title="Last opp dokument" onClose={() => setModal(null)}><DocumentForm folders={[...new Set(workspace.documents.map((item) => item.folder_path).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'no'))} onClose={() => setModal(null)} onSubmit={handleUploadDocument} /></Modal>}
    </div>
  );
};

export { DocumentsView };
export default VelApp;
