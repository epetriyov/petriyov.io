# ── Стадия 1: сборка статики ──────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Стадия 2: Caddy раздаёт dist/ ─────────────────────────────────
FROM caddy:2-alpine

# два конфига: локальный (по умолчанию, :80 без TLS) и боевой (домен + auto-HTTPS)
COPY docker/Caddyfile.local /etc/caddy/Caddyfile
COPY docker/Caddyfile.prod /etc/caddy/Caddyfile.prod

COPY --from=build /app/dist /srv

EXPOSE 80 443
# CMD наследуется от базового образа: caddy run --config /etc/caddy/Caddyfile
# в production compose переопределяется на Caddyfile.prod
