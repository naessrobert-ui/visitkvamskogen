export const NAVIGATE_EVENT = 'kk:navigate';

export const navigate = (path, { replace = false } = {}) => {
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (current !== path) {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
};

// Lar nettleseren håndtere ny fane, midtklikk og lenker til andre apper (/vel/) selv.
export const shouldHandleClick = (event, href) => (
  !event.defaultPrevented
  && event.button === 0
  && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  && typeof href === 'string'
  && href.startsWith('/')
  && !href.startsWith('//')
  && !href.startsWith('/vel')
);
