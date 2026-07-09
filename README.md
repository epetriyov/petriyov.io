# petriyov.io

Персональный сайт-визитка с блогом. [Astro 5](https://astro.build) + Tailwind CSS 4 + [Keystatic](https://keystatic.com) (локальная админка). Сборка — чистая статика в Docker-образе с Caddy; GitHub Actions собирает образ и заливает его на VPS напрямую по SSH (без реестра).

**Документация:**

- [docs/CONTENT.md](docs/CONTENT.md) — работа с CMS и наполнение контента (статьи, Now, резюме)
- [docs/DOCKER.md](docs/DOCKER.md) — локальная проверка production-сборки в Docker (чеклист)
- [docs/DEPLOY.md](docs/DEPLOY.md) — настройка VPS и деплой с нуля
- [AGENTS.md](AGENTS.md) — инструкция для coding agents (архитектура, ограничения, гочи)

## Команды

| Команда | Что делает |
| ------------------------------- | ------------------------------------------------ |
| `npm install` | установка зависимостей |
| `npm run dev` | dev-сервер на http://localhost:4321 |
| `npm run build` | production-сборка в `dist/` |
| `npm run preview` | локальный просмотр собранного сайта |
| `npm run new:post -- "Заголовок"` | заготовка новой статьи |
| `npm run docker:local` | production-сборка в Docker → http://localhost:8080 |

Админка: `npm run dev` → **http://localhost:4321/keystatic**. Работает только в dev; правки сохраняются прямо в файлы `src/content/*`, дальше — обычный git-коммит. В production-сборку админка не попадает.

## Как добавить статью (за 1 минуту)

**Вариант А — через терминал:**

```bash
npm run new:post -- "Мой новый пост"
# → src/content/blog/moy-novyy-post.md
```

Откройте файл, напишите текст, заполните `description` и `tags`, уберите `draft: true` — готово.

**Вариант Б — через админку:** `npm run dev` → `/keystatic` → «Статьи блога» → Create. Поля формы соответствуют frontmatter.

Frontmatter статьи:

```yaml
---
title: Заголовок                  # если внутри есть ':' — возьмите в 'кавычки'
description: Одно предложение для карточки и meta (до 155 символов).
pubDate: 2026-07-08
updatedDate: 2026-07-10           # необязательно
tags: [менеджмент, iot]
draft: false                      # true — не публикуется в сборку
lang: ru                          # ru | en
---
```

Схемы всех коллекций — в [src/content.config.ts](src/content.config.ts). Ошибка в frontmatter валит сборку с понятным сообщением — это защита, а не баг.

## Как обновить страницу Now (самая частая операция)

Правится [src/content/pages/now.md](src/content/pages/now.md): текст + **обязательно** два поля frontmatter:

- `summary` — одна строка для тизера на главной («Сейчас: …»);
- `updatedDate` — дата правки (выводится крупно на /now и в тизере).

Через админку: `/keystatic` → «Страница Now» — там есть виджет даты, чтобы не забывать `updatedDate`.

## Как поменять контакты, меню, имя

Всё в одном файле: [src/config/site.ts](src/config/site.ts) — имя, роль, email, ссылки GitHub/LinkedIn/Telegram (сейчас там **заглушки — замените!**), массив пунктов меню `nav` (порядок = порядок в шапке), число статей на страницу.

## Как обновить резюме

Данные: [src/content/resume.yaml](src/content/resume.yaml) (опыт/навыки/образование) — руками или через `/keystatic` → «Резюме». PDF-версия: замените заглушку [public/petriyov-cv.pdf](public/petriyov-cv.pdf) на настоящий файл с тем же именем.

## Как добавить страницу

1. Контент: `src/content/pages/имя.md` (title + текст).
2. Роут: `src/pages/имя.astro` — скопируйте [src/pages/now.astro](src/pages/now.astro) как образец.
3. Пункт меню: добавьте `{ label: '…', href: '/имя/' }` в `nav` в `site.ts`.

## Что заменить перед запуском

- [ ] `src/assets/avatar.jpg` — сейчас нейтральная заглушка; положите своё фото (квадратное, от 512×512).
- [ ] `public/petriyov-cv.pdf` — заглушка; положите реальное резюме.
- [ ] Ссылки GitHub/LinkedIn/Telegram в `src/config/site.ts`.
- [ ] Тексты `src/content/pages/about.md`, `en/about.md`, `now.md` и `resume.yaml` — сейчас демо-контент.
- [ ] Демо-статьи в `src/content/blog/` — удалите или замените.

## Структура

- `src/content/` — весь контент (статьи, страницы, резюме);
- `src/config/site.ts` — имя/контакты/меню;
- `src/components/`, `src/layouts/` — UI;
- `src/pages/` — роуты, включая RSS (`/rss.xml`) и OG-изображения (`/og/*.png`);
- `Dockerfile`, `docker/Caddyfile.*`, `docker-compose*.yml`, `.github/workflows/deploy.yml` — сборка и деплой.

## Деплой

Push в `main` → GitHub Actions собирает Docker-образ (статика + Caddy), передаёт его на VPS по SSH (`docker save | docker load`) и перезапускает контейнер. Первичная настройка сервера (Docker, DNS, secrets) — в [docs/DEPLOY.md](docs/DEPLOY.md); локальная проверка образа — [docs/DOCKER.md](docs/DOCKER.md).
