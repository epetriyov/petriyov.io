# Инструкция для coding agents

Персональный сайт-визитка с блогом (petriyov.io). Статика без серверного рантайма: Astro 5 + Tailwind CSS 4, контент в git, деплой Docker-образом (Caddy) через GitHub Actions.

## Команды

```bash
npm run dev          # dev-сервер :4321 + админка /keystatic
npm run build        # production-сборка в dist/ (валидирует контент-схемы)
npm run check        # astro check (TypeScript strict) — должно быть 0 ошибок
npm run new:post -- "Заголовок"   # заготовка статьи
npm run docker:local # локальная проверка prod-сборки → :8080 (docs/DOCKER.md)
```

**Definition of Done для любого изменения:** `npm run build` и `npm run check` проходят без ошибок; вёрстку смотреть на 680px-десктопе и 375px-мобиле; для страниц с новым HTML — Lighthouse ≥ 95 по всем категориям (`npx serve dist` + `npx lighthouse <url> --chrome-flags="--headless=new"`).

## Жёсткие ограничения — не нарушать

1. **Astro закреплён на `^5`. Не обновлять до 6/7**: `@keystatic/astro@5` поддерживает Astro максимум 6, реальная совместимость проверена на 5.x. Обновление мажора Astro = осознанное решение владельца, не «попутный апгрейд».
2. **`dist/` обязан оставаться чистой статикой.** Keystatic (и react/markdoc) подключаются в [astro.config.mjs](astro.config.mjs) только при `astro dev` (проверка `process.argv.includes('dev')`). Не переносить эти интеграции в общий список и не добавлять adapter/SSR.
3. **Палитра и типографика — контракт.** Дизайн-токены заданы в `@theme` в [src/styles/global.css](src/styles/global.css) и являются утверждённым дизайном («Typographic × Calm stone»). Не менять цвета/размеры без прямого запроса владельца. Известный трейд-офф: приглушённые цвета дат (`#9AA18F`) дают Lighthouse accessibility ровно 95 из-за контраста — это принято сознательно, «чинить» не нужно.
4. **Одна колонка `max-width: 680px`** на всех страницах, никаких градиентов и декоративной графики, один акцентный цвет.
5. **Никаких внешних ресурсов в рантайме**: шрифты self-hosted (fontsource + локальные OTF), аналитики нет, CDN нет. CSP в Caddy это принудительно закрепляет (`docker/Caddyfile.prod`).

## Карта проекта

```
astro.config.mjs          # sitemap, dev-only keystatic, tailwind, remark reading-time, shiki
keystatic.config.ts       # схемы админки — зеркало content.config.ts (см. «Гочи» №1)
src/
  config/site.ts          # ЕДИНЫЙ конфиг: имя, контакты, меню nav[], postsPerPage
  content.config.ts       # zod-схемы коллекций blog / pages / resume
  content/                # контент (Markdown/YAML) — обычно правит владелец, не агенты
  styles/global.css       # дизайн-токены @theme + .prose + .section-label
  layouts/Base.astro      # <head> целиком: SEO, OG, canonical, hreflang; скелет страницы
  components/             # Nav, Footer, PostCard, NowTeaser, TOC, Pagination, PrevNext,
                          # JsonLdPerson, JsonLdBlogPosting
  lib/format.ts           # даты ru/en, время чтения (склонения)
  lib/remark-reading-time.mjs
  pages/                  # роуты; blog/[...page] — пагинация, og/[...route].ts — OG-картинки
docker/                   # Caddyfile.local (HTTP, :80) и Caddyfile.prod (домен, HSTS)
Dockerfile                # node:22-alpine build → caddy:2-alpine
docs/                     # DEPLOY.md, DOCKER.md, CONTENT.md
```

## Как делать типовые изменения

**Стили.** Утилиты Tailwind в разметке + токены из `@theme` (`text-ink`, `bg-surface`, `border-line`, `text-accent`, `shadow-card`, `rounded-card`…). Точечные размеры из макета записаны arbitrary-значениями (`text-[16.5px]`). Стили markdown-контента — класс `.prose` в global.css (плагин typography не используется намеренно).

**Новая страница.** Роут `src/pages/имя.astro` на базе `Base.astro` (обязательны `title` ≤ 60 симв. и `description` ≤ 155); если у страницы редактируемый текст — markdown в `src/content/pages/` + рендер через `getEntry`/`render` (образец: [src/pages/now.astro](src/pages/now.astro)); пункт меню — массив `nav` в `site.ts`.

**Новое поле контента.** Менять **обе** схемы синхронно: zod в `content.config.ts` **и** поля в `keystatic.config.ts`. Затем прогнать `npm run dev` и открыть соответствующий раздел в `/keystatic` — Keystatic валидирует существующие файлы строго и упадёт на лишнем/недостающем ключе frontmatter.

**Компонент с интерактивностью.** Сайт обходится нулём клиентского JS — сохраняйте это. Если интерактив неизбежен, сначала `<script>` в Astro-компоненте (vanilla), react-остров — крайняя мера (react подключён только в dev для Keystatic!).

## SEO-инварианты

- title ≤ 60 символов, description ≤ 155, каждая страница уникальна;
- canonical и OG собирает `Base.astro` — не дублировать метатеги в страницах;
- JSON-LD: `Person` на / и /about (компонент `JsonLdPerson`), `BlogPosting`+`BreadcrumbList` на статьях;
- обе формы фамилии («Петриёв», «Petriyov») присутствуют в H1/тексте главной и /about;
- `/about` ↔ `/en/about` связаны hreflang (проп `alternates` у Base);
- новые «технические» роуты (эндпоинты, картинки) исключать из sitemap через `filter` в astro.config.mjs.

## Гочи (проверено на практике)

1. **Keystatic строг к frontmatter**: ключ, которого нет в схеме синглтона/коллекции — ошибка «Key … is not allowed» в админке. Схемы в двух файлах должны совпадать всегда.
2. **YAML и двоеточия**: `title: Текст: с двоеточием` ломает парсинг — нужны кавычки. Сборка упадёт с внятной ошибкой — это фича, не чините «ослаблением» схемы.
3. **astro-og-canvas 0.13**: `await OGImageRoute({...})` (промис!), опции `param` больше нет — имя параметра берётся из имени файла роута. Шрифты для OG — локальные OTF в `src/assets/fonts/` (нужна кириллица; woff2 из fontsource не подходит — canvaskit его не читает).
4. **Черновики**: фильтр `import.meta.env.DEV || !data.draft` в каждом `getCollection` для страниц и `!data.draft` в RSS/OG. При добавлении новых выборок из блога не забывайте фильтр.
5. **canonical с завершающим слэшем** — хелпер `canonicalUrl()` в `site.ts`; ссылки в разметке тоже пишите со слэшем (`/blog/`, `/about/`).
6. **Кириллические теги** дают кириллические URL (`/blog/tags/менеджмент/`) — это работает и это ок.
7. Астро-ассеты: у всех `<img>`/`<Image>` заданы width/height; аватар импортируется из `src/assets/avatar.jpg` (также идёт в JSON-LD и OG-fallback).

## Деплой (агентам обычно трогать не нужно)

Push в `main` → `.github/workflows/deploy.yml`: docker build в CI (теги `latest` + `sha-*`) → `docker save | gzip | ssh … docker load` (реестра нет) → `docker compose up -d`; на VPS хранятся 5 последних sha-образов для отката. Конфиг на сервере: `/opt/petriyov.io/docker-compose.yml` (+ опциональный `.env` с `IMAGE_TAG` для пина при откате). Подробности: [docs/DEPLOY.md](docs/DEPLOY.md). Меняя Dockerfile/Caddyfile — прогоните локальный чеклист [docs/DOCKER.md](docs/DOCKER.md) и `caddy validate` для prod-конфига.
