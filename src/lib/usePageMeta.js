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

// Sider som henter innholdet sitt selv (som en sak på Aktuelt) sender null og setter metadata når innholdet er lastet.
export const usePageMeta = (meta) => {
  const { title, description, image, type = 'website', noindex } = meta || {};
  useEffect(() => {
    if (!title) return;
    const url = SITE_ORIGIN + (window.location.pathname.replace(/\/+$/, '') || '/');
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', type);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    if (image) {
      const imageUrl = new URL(image, SITE_ORIGIN).href;
      upsertMeta('property', 'og:image', imageUrl);
      upsertMeta('name', 'twitter:image', imageUrl);
    } else {
      document.head.querySelector('meta[property="og:image"]')?.remove();
      document.head.querySelector('meta[name="twitter:image"]')?.remove();
    }
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(url);
  }, [title, description, image, type, noindex]);
};
