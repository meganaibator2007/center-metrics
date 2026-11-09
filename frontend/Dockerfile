# Клиент React: Node собирает статические файлы, nginx их раздаёт и пересылает /api на бэкенд.
# Собирается из корня репозитория: в docker-compose.yml context: . и dockerfile: frontend/Dockerfile.
# Какие файлы попадают в сборку — frontend/Dockerfile.dockerignore.

FROM node:24.22-alpine AS build
WORKDIR /app
# Сначала только списки зависимостей: пока они не меняются, Docker берёт npm ci из кэша
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json ./
COPY frontend/public ./public
COPY frontend/src ./src
# Режим production: .env.development с заглушками не читается, клиент ходит в настоящий API
RUN npm run build

FROM nginx:1.30-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
