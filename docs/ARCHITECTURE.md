# Архитектура center-metrics

Статус: структура согласована 07.11.2026, каркас собран в ветке `skeleton-project`.
Общие правила стека и кода — в [техсоглашениях](TECH_AGREEMENTS.md) (PR #123), список адресов API — в [api.md](api.md).

## Коротко

Сервер — одно приложение Spring Boot. Это модульный монолит: код разделён на пакеты по фичам, и каждый пакет можно позже выделить в отдельный сервис.

Система запускается в трёх контейнерах, как в ShareIt (gateway → server → db):

```
браузер ──:80──▶ frontend (nginx + файлы React)
                   ├─ /                  → index.html и файлы React
                   └─ /api, Swagger      → backend:8080 (Spring Boot)
                                               └──▶ db:5432 (PostgreSQL 16)
```

| Часть | Как собирается | Где |
|---|---|---|
| `app` | Maven (`./mvnw`), единственный Maven-модуль | `app/`, `app/Dockerfile` |
| `frontend` | npm и Vite, в Maven не входит | `frontend/`, `frontend/Dockerfile`, `frontend/nginx.conf` |
| база | готовый образ `postgres:16-alpine` | `docker-compose.yml` |

## Пакеты

Пакеты лежат в `app/src/main/java/ru/fa/kpi/`.

| Пакет | За что отвечает | Таблицы | Миграции |
|---|---|---|---|
| `common` | безопасность, формат ошибок, общие события | — | — |
| `user` | пользователи, роли, вход и выход, смена пароля | `usr_` | V100–V199 |
| `indicator` | категории, показатели, коэффициент, максимальный балл, архив, поля формы | `ind_` | V200–V299 |
| `period` | отчётные периоды, проверка пересечения дат, закрытие | `per_` | V300–V399 |
| `entry` | журнал достижений преподавателя по датам и файлы (подпакет `attachment`) | `ent_` | V400–V499 |
| `scoring` | баллы: значение × коэффициент, но не больше максимума | `scr_` | V500–V599 |
| `report` | кабинет, отправка отчёта, отчёт преподавателя, сводный отчёт, контроль сдачи | `rep_` | V600–V699 |

В каждом пакете лежит `package-info.java`: в нём описание пакета и список пакетов, от которых ему разрешено зависеть.

## Кто от кого зависит

```
user    indicator    period          ни от кого, кроме common
   ↑        ↑          ↑
   └───── entry ───────┘             проверяет: дата не в закрытом периоде и не в отправленном отчёте
            │ событие EntryChanged
            ▼
         scoring → indicator, period
            ↑
         report → все пакеты

report публикует ReportSubmitted / ReportReturned (лежат в common),
entry их слушает и блокирует или разблокирует записи
```

| Пакет | Может зависеть от |
|---|---|
| `common` | ни от кого |
| `user`, `indicator`, `period` | `common` |
| `entry` | `common`, `user`, `indicator`, `period` |
| `scoring` | `common`, `entry`, `indicator`, `period` |
| `report` | `common`, `user`, `indicator`, `period`, `entry`, `scoring` |

`scoring` зависит от `period`, чтобы не пересчитывать баллы закрытых периодов, когда у показателя меняется коэффициент.

Таблицу проверяет тест `ModularityTest` (Spring Modulith). Если `entry` обратится к `report`, тест упадёт с сообщением вида «Module 'entry' depends on module 'report'… Allowed targets: common, user, indicator, period». Новая зависимость появляется только через правку `package-info.java` в PR, чтобы её увидели на ревью.

## События

- `EntryChanged` лежит в `entry` и публикуется при сохранении и при удалении записи. `scoring` слушает его синхронно (`@EventListener`) в той же транзакции и пересчитывает баллы всех открытых периодов, в которые попадает дата записи.
- `ReportSubmitted` и `ReportReturned` лежат в `common`. Если положить их в `report`, `entry` начал бы зависеть от `report`, а `report` и так зависит от `entry`, получился бы цикл.
- В событиях передаём только ID и простые значения, не сущности.

## Что лежит в пакете

Цепочка как в ShareIt: `Controller → Service → Repository`. Контроллер не ходит в репозиторий и не содержит бизнес-логики.

| Файл | Назначение | Видимость |
|---|---|---|
| `User` | JPA-сущность | package-private, где возможно |
| `UserRepository` | Spring Data JPA | package-private |
| `UserMapper` | ручной маппер | package-private |
| `UserController` | REST API пакета | package-private |
| `UserRequest` | тело запроса и аннотации валидации | package-private |
| `UserDto` | ответ API и данные для других пакетов (record) | public |
| `UserService` | бизнес-логика и транзакции, API пакета | public |

Другие пакеты используют только `XxxService` и `XxxDto`. Чужие сущности, репозитории и мапперы трогать нельзя.

## Мапперы

Мапперы пишем руками, без MapStruct: статические методы `toDto(User)`, `toEntity(UserRequest)`, `update(User, UserRequest)`.

- Поля переносим явно, по одному.
- `id`, роль, пароль и статус маппер из запроса не копирует никогда. Их задаёт сервис: пароль сохраняет как хеш BCrypt, роль ставит только после проверки, что запрос пришёл от админа. Иначе пользователь мог бы прислать `"role": "ADMIN"` и стать админом.
- DTO — `record`, поэтому новое поле не потеряется: без него не соберётся вызов конструктора.

## База и миграции

Таблицы, колонки и индексы описаны в [DATABASE.md](DATABASE.md).

- **Журнал по датам.** Запись преподавателя не привязана к периоду, у неё есть дата. Отчёт за любой период — записи, дата которых в него входит: статья от 15.10 попадает и в октябрь, и в семестр без повторного ввода. Периоды разных типов могут накладываться, одного типа — нет.
- Кабинет без `periodId` показывает открытый период, в который попадает сегодняшняя дата; если таких несколько — самый длинный; если ни одного — открытый период с самой поздней датой окончания.
- Схему меняют только миграции Flyway, `ddl-auto: validate`.
- Имя файла: `V<номер>__<пакет>_<что_делает>.sql`, между номером и описанием **два** подчёркивания. Например, `V100__user_create_tables.sql`, следующая миграция пакета — `V101__user_add_position.sql`. С одним подчёркиванием Flyway файл не увидит.
- У каждого пакета свой диапазон номеров (таблица выше). Поэтому включено `spring.flyway.out-of-order: true`: иначе `V101`, добавленная после уже применённой `V600`, не накатится.
- Применённую миграцию не редактируем. Нужна правка — пишем новую.
- Между пакетами храним только ID, без внешних ключей и JOIN.
- Миграции лежат в `app/src/main/resources/db/migration`, тестовые данные — в `db/seed`, они подключаются только в профиле `dev`.
- Кафедра для MVP — строка у пользователя (`department`), без отдельной сущности и без `/api/departments`. В формах кафедру выбирают из списка, а не вводят вручную, иначе «Кафедра ПИ» и «кафедра ПИ» станут разными кафедрами.

## Безопасность

Настроена в `common/SecurityConfig`:

- Вход по сессии в cookie `JSESSIONID` (HttpOnly), пароли хранятся как хеш BCrypt, JWT не используем.
- Без входа открыты `GET /api/auth/csrf`, `POST /api/auth/login` и `GET /api/health`. Остальные адреса `/api` требуют входа, роль проверяется через `@PreAuthorize`.
- CSRF: токен приходит в cookie `XSRF-TOKEN`, клиент возвращает его в заголовке `X-XSRF-TOKEN`.
- Выход `POST /api/auth/logout` работает средствами Spring Security и отвечает 204.
- Ошибки 401 и 403, в том числе из фильтров Spring Security, приходят в том же формате ProblemDetail, что и остальные.

## Ошибки

`common/ApiExceptionHandler` отдаёт все ошибки в формате ProblemDetail:

| Ситуация | Код |
|---|---|
| ошибка в полях запроса, тексты по полям в `errors` | 400 |
| нет входа | 401 |
| нет прав, чужие данные, нет CSRF-токена | 403 |
| `NotFoundException` | 404 |
| `ConflictException`: период закрыт, периоды пересекаются, нет обязательных показателей | 409 |
| непредвиденная ошибка, подробности только в логе | 500 |

## API и Swagger

- Список адресов — [api.md](api.md), поля запросов и ответов — `app/src/main/resources/static/openapi.yaml` (OpenAPI 3.1). Меняем контракт — правим оба файла.
- Swagger UI: http://localhost/swagger-ui.html через nginx или http://localhost:8080/swagger-ui.html напрямую в бэкенд. На вкладке «Контракт API» — все запланированные методы, на вкладке «Реализовано в коде» — то, что уже есть в контроллерах.
- `GET /api/health` отдаёт Spring Boot Actuator, он проверяет и подключение к базе. Отдельный `HealthController` не нужен.

## Клиент

Клиент React живёт отдельно от Java-кода: собирается командой `npm run build` в статические файлы, их раздаёт nginx в контейнере `frontend`.

- nginx пересылает в бэкенд `/api`, Swagger (`/swagger-ui`, `/v3/api-docs`) и `/openapi.yaml`. Для браузера сайт и API живут на одном адресе, поэтому CORS не нужен, cookie сессии и CSRF работают без настройки.
- Любой другой адрес (`/admin/users`, `/cabinet`) nginx отдаёт как `index.html`, экран выбирает React Router.
- Бэкенд стоит за прокси, поэтому включено `server.forward-headers-strategy: framework`: адрес и схему запроса Spring берёт из заголовков `X-Forwarded-*`.
- При разработке Docker для клиента не нужен: `npm run dev` поднимает Vite на `localhost:5173` и сам пересылает `/api` на `localhost:8080`.

## Docker

Три контейнера в `docker-compose.yml` (задача T-05):

| Сервис | Образ | Наружу |
|---|---|---|
| `frontend` | `frontend/Dockerfile`: Node собирает React, `nginx:stable-alpine` раздаёт | порт 80 |
| `backend` | `app/Dockerfile`: JDK 25 собирает jar через `./mvnw`, JRE 25 запускает. Собирается из корня проекта: Maven нужны `mvnw` и корневой `pom.xml` | только внутри сети Docker |
| `db` | `postgres:16-alpine`, данные в томе `pg_data` | только внутри сети Docker |

- Сборка идёт внутри Docker, поэтому на чистом компьютере `docker compose up` работает без Java, Maven и Node.
- Порядок запуска: база готова (`pg_isready`) → бэкенд готов (`/api/health`) → nginx.
- Файлы к записям лежат в томе `uploads`, путь передаётся переменной `APP_STORAGE_DIR` (`app.storage.dir`).
- Пароли — в `.env`, в репозитории только `.env.example`.
- `docker-compose.override.yml` подключается локально сам: открывает базу на 5432 (для IntelliJ) и бэкенд на 8080, включает профиль `dev`. На стенде запуск без него: `docker compose -f docker-compose.yml up -d --build`.
- Каждый день: бэкенд — `docker compose up -d db` и запуск из IntelliJ; клиент — `docker compose up -d db backend` и `npm run dev`.

## Файловая структура

Отметка «план» — файлы, которых в каркасе ещё нет.

```
center-metrics/
├── pom.xml                       родитель: Spring Boot 4.1.2, Java 25, модуль app
├── mvnw, mvnw.cmd, .mvn/         Maven Wrapper 3.9.16
├── .gitignore, .gitattributes
├── README.md
├── docker-compose.yml            frontend, backend, db; план (T-05)
├── docker-compose.override.yml   локально: порты базы и бэкенда, профиль dev; план
├── .env.example, .dockerignore   план
├── .github/                      шаблоны и CI, план
├── docs/
│   ├── TECH_AGREEMENTS.md        PR #123
│   ├── ARCHITECTURE.md           этот файл
│   ├── DATABASE.md               таблицы, колонки, индексы
│   ├── api.md                    список адресов API
│   └── adr/
├── frontend/                     клиент React, PR #126
│   ├── Dockerfile                Node собирает, nginx раздаёт; план
│   └── nginx.conf                файлы React и пересылка /api; план
└── app/
    ├── pom.xml
    ├── Dockerfile                JDK собирает jar, JRE запускает; план
    └── src/
        ├── main/java/ru/fa/kpi/
        │   ├── KpiApplication.java
        │   ├── common/
        │   │   ├── SecurityConfig.java       сессия, CSRF, 401/403, выход
        │   │   ├── CsrfController.java       GET /api/auth/csrf
        │   │   ├── ApiExceptionHandler.java  ошибки в формате ProblemDetail
        │   │   ├── NotFoundException.java, ConflictException.java
        │   │   └── ReportSubmitted.java, ReportReturned.java
        │   ├── user/          package-info.java; план: User, Role, UserRepository, UserMapper,
        │   │                  UserController, AuthController, UserRequest, LoginRequest, UserDto, UserService
        │   ├── indicator/     package-info.java; план: Indicator, Category, репозитории, мапперы,
        │   │                  контроллеры, IndicatorRequest, CategoryRequest, IndicatorDto, CategoryDto, IndicatorService
        │   ├── period/        package-info.java; план: Period, PeriodType, PeriodRepository, PeriodMapper,
        │   │                  PeriodController, PeriodRequest, PeriodDto, PeriodService
        │   ├── entry/         package-info.java; план: Entry, EntryRepository, EntryMapper, EntryController,
        │   │                  EntryRequest, EntryDto, EntryService, EntryChanged, ReportEventsListener,
        │   │                  attachment/ (Attachment, AttachmentRepository, AttachmentController, FileStorage, AttachmentDto)
        │   ├── scoring/       package-info.java; план: Score, ScoreRepository, ScoreCalculator,
        │   │                  EntryChangedListener, ScoreDto, ScoringService
        │   └── report/        package-info.java; план: Report, ReportStatus, ReportRepository, ReportMapper,
        │                      ReportController, CabinetController, ReportDto, SummaryRowDto, ControlRowDto,
        │                      CabinetDto, ReportService
        ├── main/resources/
        │   ├── application.yml           база из DB_URL, DB_USER, DB_PASSWORD; файлы в APP_STORAGE_DIR
        │   ├── application-dev.yml       локальная база и тестовые данные
        │   ├── db/migration/             V100__user_create_tables.sql … V600__report_create_tables.sql
        │   ├── db/seed/                  тестовые данные, план
        │   └── static/openapi.yaml       контракт API для Swagger UI
        └── test/java/ru/fa/kpi/
            ├── ModularityTest.java           границы пакетов
            ├── KpiApplicationTests.java      приложение целиком на PostgreSQL в Docker
            ├── TestcontainersConfiguration.java
            ├── common/                       SecurityConfigTest, ApiExceptionHandlerTest
            └── user/, indicator/, …          план: тесты пакетов
```

## Журнал решений

| Дата | Решение | Почему |
|---|---|---|
| 07.11 | Один Maven-модуль `app` вместо модуля на каждый пакет | один запускаемый jar, границы пакетов проверяет Spring Modulith |
| 07.11 | Три контейнера: nginx с React, Spring Boot, PostgreSQL. Клиент в Maven не входит | фронт и бэк собираются и перезапускаются независимо: правка в CSS не пересобирает Java и не выкидывает пользователей из системы; привычная схема из ShareIt. Заменяет вариант «клиент внутри jar» из ADR-02 |
| 07.11 | Ручные мапперы вместо MapStruct | так учили на курсе, меньше новых технологий; правило переноса полей выше |
| 07.11 | События `ReportSubmitted` и `ReportReturned` в `common` | убирают цикл `entry` ↔ `report` |
| 07.11 | Диапазоны номеров миграций и `out-of-order: true` | пакеты пишут миграции независимо |
| 07.11 | Кафедра строкой, без `/api/departments`; обязательна только у преподавателя | проще для MVP, на клиенте уже строка; у администратора кафедры нет |
| 07.11 | Журнал достижений по датам: у записи нет `period_id`, отчёт за период собирается по датам | достижение вносится один раз и попадает во все периоды, куда входит его дата; правка в одном месте |
| 07.11 | Кабинет по умолчанию: открытый период с сегодняшней датой, из нескольких — самый длинный | при открытых семестре и месяце показываем семестр, как в прототипе |
| 07.11 | Dockerfile бэкенда и фронта собирают всё внутри Docker | `docker compose up` должен работать на чистом компьютере |
| 07.11 | `/api/health` через Actuator вместо `HealthController` | меньше своего кода, заодно проверяется база |
| 07.11 | Фильтры `archived` и `closed` вместо `status` у показателей и периодов | совпадают с полями DTO в `frontend/src/api/types.ts` |
