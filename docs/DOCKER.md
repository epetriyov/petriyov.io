# Локальная проверка сайта в Docker

Образ собирается в две стадии: `node:22-alpine` строит статику (`npm run build`), `caddy:2-alpine` её раздаёт. Локально Caddy работает по HTTP на порту 8080 (конфиг `docker/Caddyfile.local`), на VPS — тот же образ, но с боевым конфигом `docker/Caddyfile.prod` (HTTPS, HSTS).

> Keystatic-админки в Docker **нет** — она существует только в `npm run dev`. Docker-образ — это ровно то, что увидят посетители в production.

## Запуск

```bash
npm run docker:local
# то же самое: docker compose -f docker-compose.local.yml up --build
```

Дождитесь `healthy` в статусе контейнера → http://localhost:8080. Остановить: `Ctrl+C` (или `docker compose -f docker-compose.local.yml down`).

## Чеклист проверки

Страницы (глазами в браузере):

- [ ] `/` — главная: фото, имя, тизер «Сейчас», 3 статьи, футер
- [ ] `/about/` и `/en/about/` — обе языковые версии
- [ ] `/resume/` — таймлайн; кнопка «Скачать PDF» отдаёт файл
- [ ] `/blog/` — список, теги-фильтры кликабельны
- [ ] страница любой статьи — оглавление, мета-строка, prev/next
- [ ] `/blog/tags/менеджмент/` — фильтр по тегу работает
- [ ] `/now/` — дата «Обновлено» на месте
- [ ] `/contacts/` — все ссылки ведут куда надо
- [ ] `/xxx-не-существует` — красивая 404 (а не голый текст Caddy)

Служебное и заголовки (в терминале, пока контейнер запущен):

```bash
# 200 на всех ключевых роутах
for p in / /about/ /en/about/ /resume/ /blog/ /now/ /contacts/ /rss.xml /robots.txt /sitemap-index.xml /petriyov-cv.pdf; do
  printf '%-25s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080$p)"
done

# 404 отдаёт кастомную страницу со статусом 404
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/no-such-page

# сжатие включено (ожидаем Content-Encoding: zstd или gzip)
curl -sI -H 'Accept-Encoding: zstd, gzip' http://localhost:8080/ | grep -i content-encoding

# security-заголовки на месте
curl -sI http://localhost:8080/ | grep -iE 'x-content-type|referrer-policy|content-security'

# годовой кэш на хэшированных ассетах
curl -sI "http://localhost:8080$(curl -s http://localhost:8080/ | grep -o '/_astro/[^"]*\.css' | head -1)" | grep -i cache-control

# OG-изображение статьи существует
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/og/kak-masshtabirovat-komandu.png
```

Ожидания: все роуты `200`, несуществующий — `404` с вёрсткой сайта, `content-encoding` присутствует, на `/_astro/*` — `max-age=31536000, immutable`.

## Как проверить именно боевой Caddy-конфиг

Синтаксис `Caddyfile.prod` валидируется без запуска:

```bash
docker run --rm -v "$PWD/docker/Caddyfile.prod:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
```

(Запустить его локально «по-настоящему» нельзя — он попытается выпустить сертификат для petriyov.io.)

## Типовые проблемы

| Симптом | Причина |
| --- | --- |
| `port is already allocated` | 8080 занят — поменяйте маппинг в `docker-compose.local.yml` |
| Пересборка не подхватила контент | соберите с `--build` (без него compose переиспользует старый образ) |
| В образе нет свежей статьи | файл не сохранён / лежит вне `src/content/blog/` |
