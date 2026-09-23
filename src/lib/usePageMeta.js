import { useEffect } from 'react';

const SITE_ORIGIN = 'https://visitkvamskogen.no';

const upsertMeta = (attr, key, content) => {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertCanonical = (href) => {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', 'canonical');
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
};

export const usePageMeta = ({ title, description, noindex }) => {
  useEffect(() => {
    const url = SITE_ORIGIN + (window.location.pathname.replace(/\/+$/, '') || '/');
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(url);
  }, [title, description, noindex]);
};
