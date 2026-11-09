# center-metrics
Система учёта показателей эффективности сотрудников: достижения, баллы, цели РОП, согласование и отчётность

## Документы

- [Архитектура](docs/ARCHITECTURE.md): три контейнера, пакеты, кто от кого зависит, миграции, мапперы
- [Контракт API](docs/api.md): список адресов. Поля запросов и ответов — в [openapi.yaml](app/src/main/resources/static/openapi.yaml)
- [База данных](docs/DATABASE.md): таблицы, ограничения, индексы

## Как устроено

Три контейнера: `frontend` (nginx раздаёт React и пересылает `/api`) → `backend` (Spring Boot) → `db` (PostgreSQL 16). Подробнее — в [архитектуре](docs/ARCHITECTURE.md#docker).

## Что нужно для бэкенда

- JDK 25
- PostgreSQL 16 для запуска, Docker для тестов с базой

Maven ставить не нужно: проект собирается через `./mvnw`, нужная версия скачается сама.

## Сборка и тесты

```bash
./mvnw verify
```

В Windows (cmd, PowerShell) вместо `./mvnw` — `mvnw.cmd`.

Тест `KpiApplicationTests` поднимает PostgreSQL в Docker через Testcontainers. Если Docker не запущен, тест пропускается, остальные проходят.

## Запуск

Локально с профилем `dev`: база `center_metrics` на `localhost:5432`, пользователь и пароль `center_metrics`.

```bash
./mvnw -pl app spring-boot:run -Dspring-boot.run.profiles=dev
```

Другие параметры базы задаются переменными `DB_URL`, `DB_USER`, `DB_PASSWORD`, папка для файлов — `APP_STORAGE_DIR` (по умолчанию `./uploads`).

| Адрес | Что там |
|---|---|
| http://localhost:8080/api/health | проверка сервера |
| http://localhost:8080/swagger-ui.html | Swagger UI: весь контракт API и то, что уже реализовано |
