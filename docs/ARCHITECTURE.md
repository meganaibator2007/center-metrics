# Архитектура center-metrics

Связанные документы: [техсоглашения](TECH_AGREEMENTS.md), [база данных](DATABASE.md), [контракт API](api.md).

## Коротко

Сервер — одно приложение Spring Boot. Это модульный монолит: код разделён на пакеты по фичам, и каждый пакет можно позже выделить в отдельный сервис.

Система запускается в трёх контейнерах:

```
браузер ──:80──▶ frontend (nginx + файлы React)
                   ├─ /                  → index.html и файлы React
                   └─ /api, Swagger      → backend:8080 (Spring Boot)
                                               └──▶ db:5432 (PostgreSQL 16)
```

Клиент и сервер собираются и перезапускаются независимо: правка клиента не пересобирает Java и не завершает сессии пользователей.

| Часть | Как собирается | Где |
|---|---|---|
| сервер | Maven (`./mvnw`), единственный Maven-модуль `app` | `app/`, `app/Dockerfile` |
| клиент | npm и Vite, в Maven не входит | `frontend/`, `frontend/Dockerfile`, конфигурация nginx |
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

Таблицу проверяет тест `ModularityTest` (Spring Modulith): если пакет обратится к пакету, которого нет в его списке, тест упадёт. Новая зависимость появляется только через правку `package-info.java`.

## События

- `EntryChanged` лежит в `entry` и публикуется при сохранении и при удалении записи. `scoring` слушает его синхронно (`@EventListener`) в той же транзакции и пересчитывает баллы всех открытых периодов, в которые попадает дата записи.
- `ReportSubmitted` и `ReportReturned` лежат в `common`, потому что `report` зависит от `entry`, и обратная зависимость дала бы цикл.
- В событиях передаются только ID и простые значения, не сущности.

## Что лежит в пакете

Цепочка вызовов: `Controller → Service → Repository`. Контроллер не обращается к репозиторию и не содержит бизнес-логики.

| Файл | Назначение | Видимость |
|---|---|---|
| `User` | JPA-сущность | package-private, где возможно |
| `UserRepository` | Spring Data JPA | package-private |
| `UserMapper` | ручной маппер | package-private |
| `UserController` | REST API пакета | package-private |
| `UserRequest` | тело запроса и аннотации валидации | package-private |
| `UserDto` | ответ API и данные для других пакетов (record) | public |
| `UserService` | бизнес-логика и транзакции, API пакета | public |

Другие пакеты используют только `XxxService` и `XxxDto`. Чужие сущности, репозитории и мапперы им недоступны.

## Мапперы

Мапперы написаны вручную: статические методы `toDto(User)`, `toEntity(UserRequest)`, `update(User, UserRequest)`.

- Поля переносятся явно, по одному.
- `id`, роль, пароль и статус маппер из запроса не копирует. Их задаёт сервис: пароль сохраняет как хеш BCrypt, роль ставит только после проверки, что запрос пришёл от админа.
- DTO — `record`, поэтому новое поле не потеряется: без него не соберётся вызов конструктора.

## База и миграции

Таблицы, колонки и индексы описаны в [DATABASE.md](DATABASE.md).

- **Журнал по датам.** Запись преподавателя не привязана к периоду, у неё есть дата. Отчёт за любой период — записи, дата которых в него входит: статья от 15.10 попадает и в октябрь, и в семестр без повторного ввода. Периоды разных типов могут накладываться, одного типа — нет.
- Кабинет без `periodId` показывает открытый период, в который попадает сегодняшняя дата; если таких несколько — самый длинный; если ни одного — открытый период с самой поздней датой окончания.
- Схему меняют только миграции Flyway, Hibernate её проверяет (`ddl-auto: validate`).
- Имя файла миграции: `V<номер>__<пакет>_<что_делает>.sql`, между номером и описанием два подчёркивания. Например, `V100__user_create_tables.sql`, следующая миграция пакета — `V101__user_add_position.sql`.
- У каждого пакета свой диапазон номеров (таблица выше), поэтому пакеты пишут миграции независимо. Включено `spring.flyway.out-of-order: true`, иначе `V101`, добавленная после уже применённой `V600`, не накатится.
- Применённая миграция не редактируется, правка делается новой миграцией.
- Между пакетами хранятся только ID, без внешних ключей и JOIN.
- Миграции лежат в `app/src/main/resources/db/migration`, тестовые данные — в `db/seed`, они подключаются только в профиле `dev`.
- Кафедра — строка у пользователя (`department`), обязательна только у преподавателя. В формах кафедру выбирают из списка, чтобы одна кафедра не записывалась по-разному.

## Безопасность

Настроена в `common/SecurityConfig`:

- Вход по сессии в cookie `JSESSIONID` (HttpOnly), пароли хранятся как хеш BCrypt.
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

- Список адресов — [api.md](api.md), поля запросов и ответов — `app/src/main/resources/static/openapi.yaml` (OpenAPI 3.1). Эти два файла меняются вместе.
- Swagger UI: `/swagger-ui.html`. На вкладке «Контракт API» — все методы контракта, на вкладке «Реализовано в коде» — то, что есть в контроллерах.
- `GET /api/health` отдаёт Spring Boot Actuator, он проверяет и подключение к базе.

## Клиент

Клиент React живёт отдельно от Java-кода: собирается командой `npm run build` в статические файлы, их раздаёт nginx в контейнере `frontend`.

- nginx пересылает в бэкенд `/api`, Swagger (`/swagger-ui`, `/v3/api-docs`) и `/openapi.yaml`. Для браузера сайт и API живут на одном адресе, поэтому CORS не нужен, cookie сессии и CSRF работают без настройки.
- Любой другой адрес (`/admin/users`, `/cabinet`) nginx отдаёт как `index.html`, экран выбирает React Router.
- Бэкенд стоит за прокси, поэтому включено `server.forward-headers-strategy: framework`: адрес и схему запроса Spring берёт из заголовков `X-Forwarded-*`.
- При разработке клиент запускается через `npm run dev`: Vite поднимается на `localhost:5173` и пересылает `/api` на `localhost:8080`.

## Docker

Три сервиса в `docker-compose.yml`:

| Сервис | Образ | Наружу |
|---|---|---|
| `frontend` | `frontend/Dockerfile`: Node собирает React, nginx раздаёт | порт 80 |
| `backend` | `app/Dockerfile`: JDK 25 собирает jar через `./mvnw`, JRE 25 запускает. Собирается из корня проекта: Maven нужны `mvnw` и корневой `pom.xml` | только внутри сети Docker |
| `db` | `postgres:16-alpine`, данные в томе `pg_data` | только внутри сети Docker |

- Сборка идёт внутри Docker, поэтому на компьютере не нужны Java, Maven и Node.
- Порядок запуска: база готова (`pg_isready`) → бэкенд готов (`/api/health`) → nginx.
- Файлы к записям лежат в томе `uploads`, путь передаётся переменной `APP_STORAGE_DIR` (`app.storage.dir`).
- Пароли хранятся в `.env`, в репозитории только `.env.example`.
- `docker-compose.override.yml` используется при локальной работе: открывает порты базы и бэкенда, включает профиль `dev`.

## Файловая структура

```
center-metrics/
├── pom.xml                       родитель: Spring Boot, Java 25, модуль app
├── mvnw, mvnw.cmd, .mvn/         Maven Wrapper
├── .gitignore, .gitattributes
├── README.md
├── docker-compose.yml            frontend, backend, db
├── docker-compose.override.yml   локальная работа: порты базы и бэкенда, профиль dev
├── .env.example, .dockerignore
├── .github/                      шаблоны и CI
├── docs/
│   ├── TECH_AGREEMENTS.md        техсоглашения
│   ├── ARCHITECTURE.md           этот файл
│   ├── DATABASE.md               таблицы, колонки, индексы
│   ├── api.md                    список адресов API
│   └── adr/                      архитектурные решения
├── frontend/                     клиент React
│   ├── Dockerfile                Node собирает, nginx раздаёт
│   └── конфигурация nginx        файлы React и пересылка /api
└── app/
    ├── pom.xml
    ├── Dockerfile                JDK собирает jar, JRE запускает
    └── src/
        ├── main/java/ru/fa/kpi/
        │   ├── KpiApplication.java
        │   ├── common/
        │   │   ├── SecurityConfig.java       сессия, CSRF, 401/403, выход
        │   │   ├── CsrfController.java       GET /api/auth/csrf
        │   │   ├── ApiExceptionHandler.java  ошибки в формате ProblemDetail
        │   │   ├── NotFoundException.java, ConflictException.java
        │   │   └── ReportSubmitted.java, ReportReturned.java
        │   ├── user/          User, Role, UserRepository, UserMapper, UserController, AuthController,
        │   │                  UserRequest, LoginRequest, UserDto, UserService
        │   ├── indicator/     Indicator, Category, репозитории, мапперы, контроллеры,
        │   │                  IndicatorRequest, CategoryRequest, IndicatorDto, CategoryDto, IndicatorService
        │   ├── period/        Period, PeriodType, PeriodRepository, PeriodMapper, PeriodController,
        │   │                  PeriodRequest, PeriodDto, PeriodService
        │   ├── entry/         Entry, EntryRepository, EntryMapper, EntryController, EntryRequest, EntryDto,
        │   │                  EntryService, EntryChanged, ReportEventsListener,
        │   │                  attachment/ (Attachment, AttachmentRepository, AttachmentController, FileStorage, AttachmentDto)
        │   ├── scoring/       Score, ScoreRepository, ScoreCalculator, EntryChangedListener, ScoreDto, ScoringService
        │   └── report/        Report, ReportStatus, ReportRepository, ReportMapper, ReportController, CabinetController,
        │                      ReportDto, SummaryRowDto, ControlRowDto, CabinetDto, ReportService
        ├── main/resources/
        │   ├── application.yml           база из DB_URL, DB_USER, DB_PASSWORD; файлы в APP_STORAGE_DIR
        │   ├── application-dev.yml       локальная база и тестовые данные
        │   ├── db/migration/             миграции Flyway V100–V699
        │   ├── db/seed/                  тестовые данные
        │   └── static/openapi.yaml       контракт API для Swagger UI
        └── test/java/ru/fa/kpi/
            ├── ModularityTest.java           границы пакетов
            ├── KpiApplicationTests.java      приложение целиком на PostgreSQL в Docker
            ├── TestcontainersConfiguration.java
            ├── common/                       SecurityConfigTest, ApiExceptionHandlerTest
            └── user/, indicator/, …          тесты пакетов
```
