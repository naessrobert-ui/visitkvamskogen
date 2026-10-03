import { useState } from 'react';
import { fallbackImageFor, relativeDate } from '../lib/aktueltFeed.js';
import { navigate } from '../lib/navigation.js';
import Link from './Link.jsx';

// Eksterne pressebilder kan blokkere hotlinking; da brukes et lokalt arkivbilde i stedet for en tom ramme.
export const StoryImage = ({ post, className, lazy = false, onFallback }) => {
  const fallback = fallbackImageFor(post.title);
  const [src, setSrc] = useState(post.image);
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading={lazy ? 'lazy' : undefined}
      onError={() => {
        if (src === fallback) return;
        setSrc(fallback);
        onFallback?.();
      }}
    />
  );
};

export const StoryMeta = ({ post }) => (
  <div className="avis-meta">
    <span className={post.origin === 'media' ? 'avis-kicker is-media' : 'avis-kicker'}>{post.kicker}</span>
    {post.paywall && <span className="avis-badge">Pluss</span>}
    <time dateTime={post.date}>{relativeDate(post.date)}</time>
  </div>
);

export const openOnCardClick = (event, post) => {
  if (event.target.closest('a, button')) return;
  navigate(post.path);
};

const AktueltKort = ({ post, size = 'normal' }) => (
  <article className={size === 'small' ? 'avis-card is-small' : 'avis-card'} onClick={(event) => openOnCardClick(event, post)}>
    <StoryImage key={post.id} post={post} className="avis-card-image" lazy />
    <StoryMeta post={post} />
    <h3><Link to={post.path}>{post.title}</Link></h3>
    {post.lede && <p>{post.lede}</p>}
  </article>
);

export default AktueltKort;
