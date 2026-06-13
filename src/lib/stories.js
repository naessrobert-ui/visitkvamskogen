export const LOCAL_STORIES_KEY = 'visitkvamskogen.localStories.v1';
export const LOCAL_STORIES_EVENT = 'visitkvamskogen:stories-updated';

const fallbackImage = '/assets/photos/summer/saata-sommar.webp';

const normalizeStory = (story) => {
  const createdAt = story?.createdAt || new Date().toISOString();

  return {
    id: story?.id || `story-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    title: String(story?.title || '').trim(),
    text: String(story?.text || '').trim(),
    images: Array.isArray(story?.images) ? story.images.filter(Boolean) : [],
    createdAt,
  };
};

export const loadLocalStories = () => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(LOCAL_STORIES_KEY) || '[]');
    return Array.isArray(stored)
      ? stored.map(normalizeStory).filter((story) => story.title && story.text)
      : [];
  } catch (_) {
    return [];
  }
};

export const saveLocalStory = (story) => {
  if (typeof window === 'undefined') return normalizeStory(story);

  const nextStory = normalizeStory(story);
  const nextStories = [nextStory, ...loadLocalStories()].slice(0, 24);
  window.localStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(nextStories));
  window.dispatchEvent(new CustomEvent(LOCAL_STORIES_EVENT, { detail: nextStory }));
  return nextStory;
};

export const storyToAktueltPost = (story) => {
  const date = story.createdAt ? story.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const dateLabel = new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T12:00:00`));

  return {
    id: story.id,
    section: 'Historie',
    date,
    dateLabel,
    image: story.images[0] || fallbackImage,
    gallery: story.images,
    imageCredit: story.images.length ? 'Innsendt bilde' : 'Lokalt arkivbilde',
    title: story.title,
    lede: story.text.length > 170 ? `${story.text.slice(0, 170).trim()}...` : story.text,
    body: story.text,
  };
};
