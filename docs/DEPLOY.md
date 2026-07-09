# Деплой petriyov.io на VPS (сборка на сервере, с нуля)

Схема: push в `main` → GitHub Actions синкает исходники на VPS (rsync по SSH) → **на самом VPS** собирается Docker-образ (статика + Caddy) → `docker compose up -d`. Реестр образов не используется; артефакты не гоняются по сети — только исходники (~несколько МБ). HTTPS-сертификаты Caddy выпускает и продлевает сам.

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

**RAM.** Сборка (npm ci + astro build) хочет ~1 ГБ. Если на VPS меньше 2 ГБ памяти — добавьте swap, иначе сборка может быть убита OOM:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

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

Всё. Содержимое (исходники, Dockerfile, docker-compose.yml) приедет само при первом деплое — workflow синкает туда репозиторий целиком. Руками в этом каталоге ничего не правьте: следующий rsync с `--delete` перезапишет любые локальные изменения (не тронет только `.env`).

## 5. Secrets в GitHub

Settings → Secrets and variables → Actions:

| Secret | Значение |
| ---------- | ------------------------------------- |
| `SSH_HOST` | IP или hostname VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое **приватного** `deploy_key` |

## 6. Первый деплой

Push в `main` (или Actions → «Deploy (build on VPS)» → Run workflow). Workflow:

1. синкает исходники в `/opt/petriyov.io` (rsync, `.env` не трогается);
2. на VPS собирает образ: `docker build --pull -t petriyov.io:latest -t petriyov.io:sha-<коммит> .` — сборка идёт **до** перезапуска, упавшая сборка не роняет работающий сайт;
3. `docker compose up -d` (compose пересоздаёт контейнер, увидев новый image id) и удаляет sha-образы старше пяти последних;
4. проверяет `https://petriyov.io/`.

Первая сборка на VPS занимает несколько минут (npm ci с нуля), дальше — быстрее за счёт кэша слоёв. Первый выпуск сертификата — ~10–30 секунд после старта контейнера.

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

Вернуться на актуальную версию: удалить `.env` (или поставить `IMAGE_TAG=latest`) и снова `docker compose up -d`. Не забудьте убрать пин: пока он стоит, новые деплои собираются, но контейнер продолжает работать на пиненой версии.

## 8. Эксплуатация

```bash
docker logs --tail 100 petriyov-site        # логи
docker compose -f /opt/petriyov.io/docker-compose.yml restart   # перезапуск
docker builder prune -f                      # если кончается место: чистка кэша сборки
```

- Volume `caddy_data` хранит сертификаты — **не удаляйте** его (`docker compose down -v` — нельзя), иначе повторный выпуск и риск rate-limit Let's Encrypt.
- Кэш сборки ускоряет деплои, но растёт; `docker builder prune -f` освобождает место (следующая сборка будет дольше).
- Обновления базовых образов (`node:22-alpine`, `caddy:2-alpine`) подтягиваются каждым деплоем — в сборке стоит `--pull`.
- Бэкапить на сервере нечего: весь контент — в git-репозитории, образ пересобирается из него.
