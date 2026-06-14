export const todayDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const isPublishedActivity = (activity) => !activity?.status || activity.status === 'published';

export const isUpcomingActivity = (activity, today = todayDateKey()) => {
  const date = String(activity?.date || '').slice(0, 10);
  return Boolean(date) && date >= today;
};

export const isVisibleUpcomingActivity = (activity, today = todayDateKey()) => (
  isPublishedActivity(activity) && isUpcomingActivity(activity, today)
);
