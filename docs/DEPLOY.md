# Деплой petriyov.io на VPS (Docker over SSH, с нуля)

Схема: push в `main` → GitHub Actions собирает Docker-образ (статика + Caddy) → передаёт его на VPS напрямую по SSH (`docker save | ssh | docker load`, без Docker-реестра) → перезапускает контейнер (`docker compose up -d`). HTTPS-сертификаты Caddy выпускает и продлевает сам.

Тяжёлая часть (npm ci, сборка) выполняется на GitHub-раннере; VPS только принимает готовый образ (~50 МБ) и запускает его — подходит даже для самого слабого сервера.

Предполагается свежий VPS с Ubuntu 22.04/24.04 и доступом root (или sudo-пользователем).

## 1. DNS

У DNS-провайдера домена `petriyov.io`:

| Тип | Имя | Значение |
| ---- | ----- | ------------------------- |
| A | `@` | IPv4-адрес VPS |
| AAAA | `@` | IPv6-адрес VPS (если есть) |
| A | `www` | тот же IPv4 |
| AAAA | `www` | тот же IPv6 |
| CAA | `@` | `0 issue "letsencrypt.org"` (опционально) |

Проверьте `dig +short petriyov.io` **до** первого запуска контейнера — иначе Caddy будет бесполезно дёргать Let's Encrypt и может упереться в rate-limit.

## 2. Установка Docker на VPS

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version   # проверка
```

Файрвол (если ufw): `sudo ufw allow 22,80,443/tcp && sudo ufw allow 443/udp` (443/udp — HTTP/3).

## 3. Deploy-пользователь

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy      # право управлять контейнерами

# SSH-ключ для GitHub Actions (выполняйте на своей машине):
ssh-keygen -t ed25519 -C "deploy@petriyov.io" -f deploy_key -N ""

# публичную часть — на сервер:
sudo -u deploy mkdir -p /home/deploy/.ssh
cat deploy_key.pub | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys
sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

> Членство в группе `docker` эквивалентно root на этой машине — ключ `deploy` храните только в GitHub Secrets.

## 4. Каталог проекта на VPS

```bash
sudo mkdir -p /opt/petriyov.io && sudo chown deploy:deploy /opt/petriyov.io
```

От пользователя `deploy` положите туда **один файл** — `docker-compose.yml` из корня репозитория (scp или копипастой). Больше ничего не нужно: образ приезжает по SSH с именем `petriyov.io:latest`, compose использует его по умолчанию. Файл `.env` понадобится только для отката (см. раздел 7).

## 5. Secrets в GitHub

Settings → Secrets and variables → Actions:

| Secret | Значение |
| ---------- | ------------------------------------- |
| `SSH_HOST` | IP или hostname VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое **приватного** `deploy_key` |

Никаких токенов реестра не требуется — реестр не используется.

## 6. Первый деплой

Push в `main` (или Actions → «Build & Deploy (Docker over SSH)» → Run workflow). Workflow:

1. соберёт образ и пометит его `petriyov.io:latest` + `petriyov.io:sha-<коммит>`;
2. перельёт его на VPS: `docker save | gzip | ssh … "docker load"`;
3. выполнит `docker compose up -d` (compose сам пересоздаёт контейнер, когда image id изменился) и удалит sha-образы старше пяти последних;
4. проверит `https://petriyov.io/`.

Первый выпуск сертификата занимает ~10–30 секунд после старта контейнера.

Проверка на сервере:

```bash
docker ps                             # petriyov-site: Up (healthy)
docker logs -f petriyov-site          # логи Caddy, в т.ч. выпуск сертификата
curl -I https://petriyov.io/
```

## 7. Откат

На VPS хранятся 5 последних образов с тегами `sha-<коммит>`:

```bash
ssh deploy@VPS
cd /opt/petriyov.io
docker images petriyov.io            # список доступных тегов

echo "IMAGE_TAG=sha-abcdef123456" > .env
docker compose up -d
```

Вернуться на актуальную версию: удалить `.env` (или поставить `IMAGE_TAG=latest`) и снова `docker compose up -d`. Следующий успешный деплой из CI в любом случае перезапустит `latest` — не забудьте убрать `.env` с пином, иначе новые релизы не будут применяться.

## 8. Эксплуатация

```bash
docker logs --tail 100 petriyov-site        # логи
docker compose -f /opt/petriyov.io/docker-compose.yml restart   # перезапуск
docker system prune -f                       # почистить мусор (sha-теги отката не тронет)
```

- Volume `caddy_data` хранит сертификаты — **не удаляйте** его (`docker compose down -v` — нельзя), иначе повторный выпуск и риск rate-limit Let's Encrypt.
- Обновление Caddy/Node приезжает само со следующей пересборкой образа (базовые образы `caddy:2-alpine`, `node:22-alpine`).
- Бэкапить на сервере нечего: весь контент — в git-репозитории, образы пересобираются из него.
