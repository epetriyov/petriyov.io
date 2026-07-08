# Деплой petriyov.io на VPS (Docker, с нуля)

Схема: push в `main` → GitHub Actions собирает Docker-образ (статика + Caddy) → публикует в GHCR (`ghcr.io/<владелец>/petriyov.io`) → по SSH выполняет на VPS `docker compose pull && up -d`. HTTPS-сертификаты Caddy выпускает и продлевает сам.

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

От пользователя `deploy` положите туда два файла:

**`/opt/petriyov.io/docker-compose.yml`** — скопируйте из корня репозитория (он написан именно для VPS).

**`/opt/petriyov.io/.env`**:

```env
IMAGE=ghcr.io/<github-владелец>/petriyov.io
IMAGE_TAG=latest
```

`<github-владелец>` — в нижнем регистре (например, `eugenepetriyov`).

### Доступ к GHCR

- **Образ публичный** (рекомендуется для простоты): после первого workflow-запуска откройте пакет на GitHub → Package settings → Change visibility → Public. На VPS ничего настраивать не нужно.
- **Образ приватный**: создайте PAT (classic) с правом `read:packages` и на VPS выполните `docker login ghcr.io -u <логин> -p <PAT>` от пользователя `deploy` (логин сохранится в `~/.docker/config.json`).

## 5. Secrets в GitHub

Settings → Secrets and variables → Actions:

| Secret | Значение |
| ---------- | ------------------------------------- |
| `SSH_HOST` | IP или hostname VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое **приватного** `deploy_key` |

`GITHUB_TOKEN` для публикации в GHCR встроенный — отдельный секрет не нужен.

## 6. Первый деплой

Push в `main` (или Actions → «Build & Deploy (Docker)» → Run workflow). Workflow: соберёт образ → запушит `latest` и `sha-<коммит>` → на VPS сделает `docker compose pull && up -d` → проверит `https://petriyov.io/`.

Первый выпуск сертификата занимает ~10–30 секунд после старта контейнера.

Проверка на сервере:

```bash
docker ps                             # petriyov-site: Up (healthy)
docker logs -f petriyov-site          # логи Caddy, в т.ч. выпуск сертификата
curl -I https://petriyov.io/
```

## 7. Откат

Каждый деплой публикует тег `sha-<12 символов коммита>` — откат это запуск предыдущего тега:

```bash
ssh deploy@VPS
cd /opt/petriyov.io
# посмотреть, какие теги есть: GitHub → Packages → petriyov.io → теги
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-abcdef123456/' .env
docker compose pull && docker compose up -d
```

Вернуться на актуальный: `IMAGE_TAG=latest` и снова `pull && up -d`.

## 8. Эксплуатация

```bash
docker logs --tail 100 petriyov-site        # логи
docker compose -f /opt/petriyov.io/docker-compose.yml restart   # перезапуск
docker system prune -f                       # почистить старые образы
```

- Volume `caddy_data` хранит сертификаты — **не удаляйте** его (`docker compose down -v` — нельзя), иначе повторный выпуск и риск rate-limit Let's Encrypt.
- Обновление Caddy/Node приезжает само со следующей пересборкой образа (базовые образы `caddy:2-alpine`, `node:22-alpine`).
- Бэкапить на сервере нечего: весь контент — в git-репозитории.
