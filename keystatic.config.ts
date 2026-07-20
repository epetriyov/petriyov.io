import { config, fields, collection, singleton } from '@keystatic/core';

/**
 * Keystatic — локальная админка для контента.
 * Доступна только в dev: `npm run dev` → http://localhost:4321/keystatic
 * Правки сохраняются прямо в файлы src/content/*.
 */
export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'petriyov.io' },
  },
  collections: {
    blog: collection({
      label: 'Статьи блога',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['pubDate'],
      schema: {
        title: fields.slug({
          name: { label: 'Заголовок', validation: { isRequired: true } },
          slug: { label: 'Slug (имя файла и URL)' },
        }),
        description: fields.text({
          label: 'Описание',
          description: 'Одно предложение для карточки и meta description (до 155 символов)',
          multiline: true,
          validation: { isRequired: true },
        }),
        pubDate: fields.date({ label: 'Дата публикации', validation: { isRequired: true } }),
        updatedDate: fields.date({ label: 'Дата обновления' }),
        tags: fields.array(fields.text({ label: 'Тег' }), {
          label: 'Теги',
          itemLabel: (props) => props.value,
        }),
        draft: fields.checkbox({ label: 'Черновик (не публиковать)', defaultValue: false }),
        lang: fields.select({
          label: 'Язык',
          options: [
            { label: 'Русский', value: 'ru' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'ru',
        }),
        content: fields.markdoc({ label: 'Текст статьи', extension: 'md' }),
      },
    }),
  },
  singletons: {
    settings: singleton({
      label: 'Настройки сайта',
      path: 'src/config/settings',
      format: { data: 'json' },
      schema: {
        email: fields.text({ label: 'Email', validation: { isRequired: true } }),
        github: fields.url({ label: 'GitHub', validation: { isRequired: true } }),
        linkedin: fields.url({ label: 'LinkedIn', validation: { isRequired: true } }),
        telegram: fields.url({ label: 'Telegram', validation: { isRequired: true } }),
        bio: fields.text({
          label: 'Био на главной',
          description: '2–3 предложения; ссылка «Подробнее — обо мне» добавится автоматически',
          multiline: true,
          validation: { isRequired: true },
        }),
      },
    }),
    about: singleton({
      label: 'Страница «Обо мне»',
      path: 'src/content/pages/about',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.text({ label: 'Заголовок', validation: { isRequired: true } }),
        description: fields.text({ label: 'Meta description', multiline: true }),
        lang: fields.select({
          label: 'Язык',
          options: [
            { label: 'Русский', value: 'ru' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'ru',
        }),
        content: fields.markdoc({ label: 'Текст', extension: 'md' }),
      },
    }),
    aboutEn: singleton({
      label: 'Страница «About» (EN)',
      path: 'src/content/pages/en/about',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.text({ label: 'Title', validation: { isRequired: true } }),
        description: fields.text({ label: 'Meta description', multiline: true }),
        lang: fields.select({
          label: 'Язык',
          options: [
            { label: 'Русский', value: 'ru' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'en',
        }),
        content: fields.markdoc({ label: 'Текст', extension: 'md' }),
      },
    }),
    now: singleton({
      label: 'Страница «Now»',
      path: 'src/content/pages/now',
      format: { contentField: 'content' },
      entryLayout: 'content',
      schema: {
        title: fields.text({ label: 'Заголовок', validation: { isRequired: true } }),
        summary: fields.text({
          label: 'Тизер для главной',
          description: 'Одна строка: «Сейчас: {этот текст}»',
          validation: { isRequired: true },
        }),
        updatedDate: fields.date({
          label: 'Дата обновления',
          description: 'Не забудьте обновить при каждой правке!',
          validation: { isRequired: true },
        }),
        lang: fields.select({
          label: 'Язык',
          options: [
            { label: 'Русский', value: 'ru' },
            { label: 'English', value: 'en' },
          ],
          defaultValue: 'ru',
        }),
        content: fields.markdoc({ label: 'Текст', extension: 'md' }),
      },
    }),
    resume: singleton({
      label: 'Резюме',
      path: 'src/content/resume',
      format: { data: 'yaml' },
      schema: {
        role: fields.text({ label: 'Роль', validation: { isRequired: true } }),
        summary: fields.text({ label: 'Кратко', multiline: true, validation: { isRequired: true } }),
        experience: fields.array(
          fields.object({
            company: fields.text({ label: 'Компания', validation: { isRequired: true } }),
            title: fields.text({ label: 'Должность', validation: { isRequired: true } }),
            start: fields.text({ label: 'Начало (например, 2021)', validation: { isRequired: true } }),
            end: fields.text({ label: 'Конец (пусто = «сейчас»)' }),
            location: fields.text({ label: 'Локация' }),
            points: fields.array(fields.text({ label: 'Пункт' }), {
              label: 'Достижения',
              itemLabel: (props) => props.value,
            }),
          }),
          {
            label: 'Опыт',
            itemLabel: (props) => `${props.fields.title.value} — ${props.fields.company.value}`,
          }
        ),
        skills: fields.array(
          fields.object({
            group: fields.text({ label: 'Группа', validation: { isRequired: true } }),
            items: fields.array(fields.text({ label: 'Навык' }), {
              label: 'Навыки',
              itemLabel: (props) => props.value,
            }),
          }),
          { label: 'Навыки', itemLabel: (props) => props.fields.group.value }
        ),
        education: fields.array(
          fields.object({
            place: fields.text({ label: 'Учебное заведение', validation: { isRequired: true } }),
            degree: fields.text({ label: 'Степень/специальность', validation: { isRequired: true } }),
            start: fields.text({ label: 'Начало' }),
            end: fields.text({ label: 'Конец' }),
          }),
          { label: 'Образование', itemLabel: (props) => props.fields.place.value }
        ),
        extras: fields.array(fields.text({ label: 'Пункт' }), {
          label: 'Дополнительно',
          description: 'Конференции, пет-проекты и т.п.',
          itemLabel: (props) => props.value,
        }),
      },
    }),
  },
});
