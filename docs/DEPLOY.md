# Деплой petriyov.io на VPS

Схема: GitHub Actions собирает сайт и выкладывает `dist/` на VPS по SSH. Caddy раздаёт статику и сам получает HTTPS-сертификаты.

## 1. DNS

У DNS-провайдера домена `petriyov.io` создайте записи:

| Тип | Имя | Значение |
| ---- | ----- | ------------------- |
| A | `@` | IPv4-адрес VPS |
| AAAA | `@` | IPv6-адрес VPS (если есть) |
| A | `www` | тот же IPv4 |
| AAAA | `www` | тот же IPv6 |
| CAA | `@` | `0 issue "letsencrypt.org"` (опционально, но рекомендуется) |

Проверка: `dig +short petriyov.io` должен вернуть IP вашего VPS. Дождитесь распространения DNS **до** первого запуска Caddy, иначе выпуск сертификата упрётся в лимиты Let's Encrypt.

## 2. Установка Caddy (Ubuntu 22.04/24.04)

```bash
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Скопируйте `Caddyfile` из корня репозитория в `/etc/caddy/Caddyfile` и перезапустите:

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Откройте порты 80 и 443 (`sudo ufw allow 80,443/tcp`, если используете ufw).

## 3. Deploy-пользователь и структура каталогов

```bash
# пользователь без пароля, только для деплоя
sudo adduser --disabled-password --gecos "" deploy

# структура: releases + симлинк, который читает Caddy
sudo mkdir -p /var/www/releases
sudo chown -R deploy:deploy /var/www

# первый (пустой) релиз, чтобы Caddy было что раздавать
sudo -u deploy mkdir /var/www/releases/initial
sudo -u deploy ln -sfn /var/www/releases/initial /var/www/petriyov.io
```

SSH-ключ для GitHub Actions:

```bash
ssh-keygen -t ed25519 -C "deploy@petriyov.io" -f deploy_key -N ""
# публичный ключ — на сервер:
sudo -u deploy mkdir -p /home/deploy/.ssh
cat deploy_key.pub | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 700 /home/deploy/.ssh && sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

## 4. Secrets в GitHub

В репозитории: Settings → Secrets and variables → Actions → New repository secret.

| Secret | Значение |
| ---------- | ------------------------------------ |
| `SSH_HOST` | IP или hostname VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | содержимое **приватного** `deploy_key` |

## 5. Первый деплой

Push в `main` — workflow `.github/workflows/deploy.yml` соберёт сайт и выложит его. Проверьте: https://petriyov.io и https://www.petriyov.io (должен редиректить на apex).

Деплой атомарный: новый релиз загружается в `/var/www/releases/<timestamp>`, затем симлинк `/var/www/petriyov.io` переключается одной операцией. Старые релизы хранятся (последние 5).

## 6. Откат

```bash
ssh deploy@VPS
ls -dt /var/www/releases/*            # список релизов, новые сверху
ln -sfn /var/www/releases/<нужный> /var/www/petriyov.io
```

Перезапуск Caddy не требуется — симлинк подхватывается сразу.
