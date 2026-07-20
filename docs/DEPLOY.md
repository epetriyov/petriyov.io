# Деплой petriyov.io на VPS (сборка в CI)

Схема: кнопка **Run workflow** в GitHub Actions → образ собирается **на GitHub-раннере** → готовый образ передаётся на VPS по SSH (`docker save | gzip | ssh | docker load`, ~50 МБ) → `docker compose up -d`. Деплой запускается **только вручную** — push в `main` сам по себе ничего не выкатывает. Реестр образов не используется.

Схема рассчитана на слабый VPS (проверено на 1 CPU / 1 ГБ RAM / 10 ГБ диска): сервер ничего не собирает — только принимает образ и запускает контейнер. Кэша сборки и исходников на сервере нет; 5 образов для отката делят базовые слои и занимают суммарно ~100 МБ.

## Архитектура на сервере: общий Traefik

VPS общий с другими проектами. Порты 80/443, HTTPS-сертификаты (Let's Encrypt) и редирект HTTP→HTTPS держит **Traefik** из стека `/home/ai-agent` (сеть `ai-agent_web`). Контейнер сайта портов не публикует: он подключается к сети Traefik и регистрируется labels в своём `docker-compose.yml` — роутер `petriyov-site` на `Host(petriyov.io) || Host(www.petriyov.io)` + middleware www→apex; Caddy внутри слушает голый `:80` и отдаёт security-заголовки (включая HSTS).

⚠️ На том же домене живёт Telegram-бот (`petriyov-agent`): его роутер обслуживает `petriyov.io/tg/*` и `/healthz` с `priority=100`. Не занимайте эти пути на сайте и не удаляйте его роутер — сломается вебхук бота.

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

**Swap (рекомендуется при 1 ГБ RAM).** Для работы сайта памяти хватает с запасом (Caddy со статикой ест ~30–50 МБ), но небольшой swap страхует систему от OOM при всплесках (обновления apt, docker load):

```bash
sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile
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

Всё. Свежий `docker-compose.yml` привозится самим деплоем при каждом запуске (не редактируйте его на сервере — перезапишется). Образ приезжает по SSH с фиксированным именем `petriyov.io`. Файл `.env` понадобится только для отката (раздел 7) и должен содержать **только** `IMAGE_TAG` — ничего больше. Исходники на сервере не хранятся.

## 5. Secrets в GitHub

Settings → Secrets and variables → Actions:

| Secret | Значение |
| ---------- | ------------------------------------- |
| `SSH_HOST` | IP или hostname VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое **приватного** `deploy_key` |

## 6. Деплой

GitHub → вкладка **Actions** → workflow «Deploy (build in CI)» → **Run workflow** (ветка `main`). Так выкатывается и первый, и каждый последующий релиз: пуши накапливаются в `main`, на прод уходит текущее состояние ветки в момент нажатия кнопки. Workflow:

1. собирает образ на раннере: `docker build --pull -t petriyov.io:latest -t petriyov.io:sha-<коммит> .`;
2. переливает его на VPS: `docker save | gzip | ssh … "docker load"` (~50 МБ) + копирует свежий `docker-compose.yml`;
3. `docker compose up -d` (compose пересоздаёт контейнер, увидев новый image id) и удаляет sha-образы старше пяти последних;
4. проверяет `https://petriyov.io/`.

Нагрузка на VPS при деплое — только распаковка образа; сборки нет. Сертификат для домена выпускает Traefik при первом обращении к роутеру (~10–30 секунд); он хранится в `acme.json` стека Traefik и от передеплоев сайта не зависит.

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

Вернуться на актуальную версию: удалить `.env` (или поставить `IMAGE_TAG=latest`) и снова `docker compose up -d`. Не забудьте убрать пин: пока он стоит, новые деплои привозят образ, но контейнер продолжает работать на пиненой версии.

## 8. Эксплуатация

```bash
docker logs --tail 100 petriyov-site        # логи
docker compose -f /opt/petriyov.io/docker-compose.yml restart   # перезапуск
docker system df                             # сколько места занято образами
docker image prune -f                        # чистка мусора (sha-теги отката не тронет)
```

- Сертификаты хранит Traefik (`/home/ai-agent/traefik/acme.json`) — контейнер сайта stateless, его можно удалять/пересоздавать свободно.
- Диска хватает с большим запасом: Docker + 5 образов ≈ 2–3 ГБ из 10.
- Обновления базовых образов (`node:22-alpine`, `caddy:2-alpine`) подтягиваются каждым деплоем — в сборке стоит `--pull`.
- Бэкапить на сервере нечего: весь контент — в git-репозитории, образ пересобирается из него.
