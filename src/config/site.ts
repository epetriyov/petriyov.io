/**
 * Единый конфиг сайта: имя, роль, контакты, меню.
 * Меняется в одном месте — подхватывается везде (nav, футер, контакты, SEO, JSON-LD).
 */
export const SITE = {
  url: 'https://petriyov.io',
  /** Имя для шапки/футера/JSON-LD */
  name: 'Евгений Петриёв',
  nameEn: 'Eugene Petriyov',
  lastName: 'Петриёв',
  lastNameEn: 'Petriyov',
  role: 'Engineering Manager · Head of Development',
  jobTitles: ['Engineering Manager', 'Head of Development'],
  knowsAbout: ['IoT', 'Engineering Management', 'Software Architecture', 'Hiring', 'Team Leadership'],
  /** Описание сайта по умолчанию (для главной и RSS) */
  description:
    'Евгений Петриёв (Eugene Petriyov) — engineering manager и head of development. Блог о менеджменте в инженерии, IoT-платформах, архитектуре и найме.',

  email: 'eugene.petriyov@gmail.com',
  social: {
    // TODO: замените заглушки на свои реальные профили
    github: 'https://github.com/petriyov',
    linkedin: 'https://www.linkedin.com/in/petriyov',
    telegram: 'https://t.me/petriyov',
  },

  /** Основная навигация — порядок и состав меню */
  nav: [
    { label: 'Обо мне', href: '/about/' },
    { label: 'Резюме', href: '/resume/' },
    { label: 'Блог', href: '/blog/' },
    { label: 'Now', href: '/now/' },
    { label: 'Контакты', href: '/contacts/' },
  ],

  postsPerPage: 10,
} as const;

/** Абсолютный canonical-URL с завершающим слэшем (кроме файлов вида .xml/.pdf) */
export function canonicalUrl(pathname: string): string {
  const path = /\.[a-z]+$/i.test(pathname) || pathname.endsWith('/') ? pathname : pathname + '/';
  return new URL(path, SITE.url).href;
}
