/** «14 июн 2026» / "Jun 14, 2026" */
export function formatDate(date: Date, lang: 'ru' | 'en' = 'ru'): string {
  if (lang === 'en') {
    return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(date)
    .replace(/\./g, '')
    .replace(' г', '');
}

/** ISO-дата для <time datetime> */
export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** «5 минут», «1 минута» … */
export function readingTimeLabel(minutes: number, lang: 'ru' | 'en' = 'ru'): string {
  if (lang === 'en') return `${minutes} min read`;
  const mod10 = minutes % 10;
  const mod100 = minutes % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? 'минута'
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? 'минуты'
        : 'минут';
  return `${minutes} ${word} чтения`;
}
