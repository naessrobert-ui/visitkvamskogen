import { useState } from 'react';
import { formatDate, relatedPosts, sourceName, useAktueltFeed } from '../lib/aktueltFeed.js';
import { usePageMeta } from '../lib/usePageMeta.js';
import { UpcomingBox, upcomingActivities } from './Aktuelt.jsx';
import AktueltKort, { StoryImage } from './AktueltKort.jsx';
import Link from './Link.jsx';
import '../styles/aktuelt.css';

const SITE = 'Kvamskogen';

const SakMeta = ({ post }) => {
  const description = post.lede || `${post.title}. ${post.origin === 'media' ? `Sak fra ${sourceName(post.source)}.` : ''}`.trim();
  usePageMeta({ title: `${post.title} — Aktuelt fra ${SITE}`, description, noindex: false });
  return null;
};

const MediaSource = ({ post }) => (
  <aside className="sak-source" aria-label="Om kilden">
    <p>
      Saken er skrevet av <strong>{sourceName(post.source)}</strong>.
      {post.paywall ? ' Hele saken krever abonnement.' : ''} Her viser vi bare tittel, bilde og ingress med lenke til originalen.
    </p>
    <a className="avis-button" href={post.url} target="_blank" rel="noreferrer">
      Les hele saken hos {sourceName(post.source)} ↗
    </a>
  </aside>
);

const OwnStoryBody = ({ post }) => {
  const paragraphs = String(post.body || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <div className="sak-body">
        {paragraphs.map((paragraph, index) => <p key={`${post.id}-${index}`}>{paragraph}</p>)}
      </div>
      {post.gallery?.length > 1 && (
        <div className="sak-gallery" aria-label={`Bilder til ${post.title}`}>
          {post.gallery.slice(1).map((image, index) => <img key={`${post.id}-gallery-${index}`} src={image} alt="" loading="lazy" />)}
        </div>
      )}
    </>
  );
};

const AktueltSak = ({ slug, activities = [], supabaseConfigured = false }) => {
  const { posts, loaded } = useAktueltFeed();
  const [usesFallback, setUsesFallback] = useState(false);
  const post = posts.find((candidate) => candidate.slug === slug);
  const upcoming = upcomingActivities(activities, supabaseConfigured);

  if (!post) {
    return (
      <section className="section avis">
        <div className="container avis-container sak-missing">
          <Link className="avis-action" to="/aktuelt">← Aktuelt</Link>
          {loaded ? (
            <>
              <h1>Fant ikke saken</h1>
              <p>Saken kan være for gammel eller fjernet. Se de siste sakene på Aktuelt.</p>
            </>
          ) : (
            <p>Henter saken …</p>
          )}
        </div>
      </section>
    );
  }

  const related = relatedPosts(post, posts);
  const credit = post.origin === 'media'
    ? (post.hasOwnImage && !usesFallback ? `Foto: ${sourceName(post.source)}` : 'Illustrasjonsfoto')
    : post.imageCredit;

  return (
    <section className="section avis">
      <SakMeta post={post} />
      <div className="container avis-container">
        <nav className="sak-breadcrumb" aria-label="Brødsmuler">
          <Link to="/aktuelt">← Aktuelt fra Kvamskogen</Link>
        </nav>

        <div className="avis-layout">
          <article className="sak">
            <div className="avis-meta">
              <span className={post.origin === 'media' ? 'avis-kicker is-media' : 'avis-kicker'}>{post.kicker}</span>
              {post.paywall && <span className="avis-badge">Pluss</span>}
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <h1>{post.title}</h1>
            {post.lede && <p className="sak-lede">{post.lede}</p>}
            <figure className="sak-figure">
              <StoryImage key={post.id} post={post} onFallback={() => setUsesFallback(true)} />
              {credit && <figcaption>{credit}</figcaption>}
            </figure>
            {post.origin === 'media' ? <MediaSource post={post} /> : <OwnStoryBody post={post} />}
            {post.origin === 'egen' && post.internalUrl && (
              <Link className="avis-button" to={post.internalUrl}>{post.linkLabel || 'Les mer'}</Link>
            )}
          </article>

          <aside className="avis-side">
            <UpcomingBox activities={upcoming} />
          </aside>
        </div>

        {related.length > 0 && (
          <section className="sak-related" aria-labelledby="sak-related-title">
            <h2 id="sak-related-title" className="avis-section-title">Flere saker fra Kvamskogen</h2>
            <div className="sak-related-grid">
              {related.map((item) => <AktueltKort key={item.id} post={item} />)}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default AktueltSak;
