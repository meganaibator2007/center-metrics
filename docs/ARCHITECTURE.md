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

## Предметная модель

Основание — ТЗ «Система учёта показателей эффективности».

- **Роли и категории независимы.** Роли: сотрудник (`EMPLOYEE`), проверяющий РОП (`REVIEWER`, в своей области), директор (`DIRECTOR`), суперадминистратор (`ADMIN`). Категории оценки: ППС, АУП, РОП. У человека может быть несколько тех и других.
- **Показатель** имеет постоянный код и редакции. Правка создаёт новую редакцию, утверждённые результаты остаются на своей. К периоду относится редакция, действующая на дату его начала.
- **Достижение** вносится один раз, относится к одному показателю и одному периоду и связывается со всеми авторами, включая внешних.
- **Баллы.** У показателя порядка «индивидуально» автор получает B целиком, у показателя «на всех авторов» — `B × c × w / Σw`. Доли внешних авторов никому не перераспределяются. Официальные суммы округляются до двух знаков методом наибольших остатков. Итог по показателю за период — `min(M, Σ)`.
- **Маршрут** у каждого достижения: `DRAFT` → `ON_REVIEW` → `REVIEWED` → `APPROVED`. С проверки результат можно вернуть (`RETURNED`) или отклонить (`REJECTED`), утверждённый — отправить на пересмотр (`REVISION`). В официальный итог входит только утверждённое.
- **Своё проверять и утверждать нельзя.** Результаты самого РОП проверяет и утверждает директор двумя отдельными решениями. Администратор не заменяет директора при утверждении.
- **Дубли.** Строгий ключ — вид достижения плюс нормализованный DOI или номер документа. Без строгого ключа ищутся похожие записи, и решение принимает проверяющий с обоснованием. Второй автор присоединяется к существующей записи.
- **Целевые показатели РОП** — отдельный тип оценки: значение измеряется каждый период и уникально по редакции показателя, периоду и программе. Баллы по ним не начисляются.
- **Пересмотр.** Утверждённая запись не редактируется напрямую: прежняя редакция сохраняется, новая проходит маршрут заново. Закрытие периода формирует снимок официальных итогов.

## Пакеты

Пакеты лежат в `app/src/main/java/ru/fa/kpi/`.

| Пакет | За что отвечает | Таблицы | Миграции |
|---|---|---|---|
| `common` | безопасность, формат ошибок, событие аудита | — | — |
| `user` | сотрудники, вход и выход, смена пароля, роли, категории, полномочия, подразделения, программы | `usr_` | V100–V199 |
| `indicator` | показатели и их редакции, архив | `ind_` | V200–V299 |
| `period` | отчётные периоды, проверка пересечения дат, закрытие и переоткрытие | `per_` | V300–V399 |
| `achievement` | единый реестр, участники и доли, подтверждения (подпакет `evidence`), дубли, маршрут согласования | `ach_` | V400–V499 |
| `scoring` | начисления, итоги, снимок при закрытии периода | `scr_` | V500–V599 |
| `report` | личные показатели, дашборд директора, выгрузки XLSX | своих нет | V600–V699 |
| `measurement` | значения целевых показателей РОП | `msr_` | V700–V799 |
| `audit` | журнал аудита | `aud_` | V800–V899 |
| `importing` | импорт XLSX с предварительной проверкой | `imp_` | V900–V999 |

В каждом пакете лежит `package-info.java`: в нём описание пакета и список пакетов, от которых ему разрешено зависеть.

## Кто от кого зависит

```
user    indicator    period          ни от кого, кроме common
   ↑        ↑          ↑
   ├── achievement ────┤             маршрут, доли, дубли
   │        │ события AchievementApproved, AchievementRejected
   │        ▼
   │     scoring → indicator, period начисления и итоги, снимок по событию PeriodClosed
   │
   └── measurement → indicator, period   цели РОП

report    → user, indicator, period, achievement, measurement, scoring
importing → user, indicator, period, achievement, measurement
audit     → только common, записывает событие AuditRecorded
```

| Пакет | Может зависеть от |
|---|---|
| `common` | ни от кого |
| `user`, `indicator`, `period`, `audit` | `common` |
| `achievement`, `measurement` | `common`, `user`, `indicator`, `period` |
| `scoring` | `common`, `achievement`, `indicator`, `period` |
| `report` | `common`, `user`, `indicator`, `period`, `achievement`, `measurement`, `scoring` |
| `importing` | `common`, `user`, `indicator`, `period`, `achievement`, `measurement` |

Таблицу проверяет тест `ModularityTest` (Spring Modulith): если пакет обратится к пакету, которого нет в его списке, тест упадёт. Новая зависимость появляется только через правку `package-info.java`.

## События

- `AchievementApproved` и `AchievementRejected` лежат в `achievement`. `scoring` слушает их синхронно (`@EventListener`) в той же транзакции: создаёт или отменяет начисления и пересчитывает итоги.
- `PeriodClosed` лежит в `period`. `scoring` по нему формирует снимок итогов.
- `AuditRecorded` лежит в `common`: его публикуют все пакеты, а `audit` записывает. Так пакетам не нужно зависеть от `audit`.
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
- `id`, роли, пароль и статус маппер из запроса не копирует. Их задаёт сервис: пароль сохраняет как хеш BCrypt, роли ставит только после проверки, что запрос пришёл от админа, статус меняет только через маршрут.
- DTO — `record`, поэтому новое поле не потеряется: без него не соберётся вызов конструктора.

## База и миграции

Таблицы, колонки и индексы описаны в [DATABASE.md](DATABASE.md).

- Схему меняют только миграции Flyway, Hibernate её проверяет (`ddl-auto: validate`).
- Имя файла миграции: `V<номер>__<пакет>_<что_делает>.sql`, между номером и описанием два подчёркивания. Например, `V100__user_create_tables.sql`, следующая миграция пакета — `V101__user_add_position.sql`.
- У каждого пакета свой диапазон номеров (таблица выше), поэтому пакеты пишут миграции независимо. Включено `spring.flyway.out-of-order: true`, иначе `V101`, добавленная после уже применённой `V900`, не накатится.
- Применённая миграция не редактируется, правка делается новой миграцией.
- Между пакетами хранятся только ID, без внешних ключей и JOIN.
- Миграции лежат в `app/src/main/resources/db/migration`, тестовые данные — в `db/seed`, они подключаются только в профиле `dev`.
- Баллы и доли — `NUMERIC` в базе и `BigDecimal` в коде, расчёт только на сервере.

## Безопасность

Настроена в `common/SecurityConfig`:

- Вход по сессии в cookie `JSESSIONID` (HttpOnly), пароли хранятся как хеш BCrypt.
- Без входа открыты `GET /api/auth/csrf`, `POST /api/auth/login` и `GET /api/health`. Остальные адреса `/api` требуют входа, роль проверяется через `@PreAuthorize`.
- Область доступа (программы РОП) и запрет проверять своё проверяются в сервисах, потому что зависят от конкретной записи.
- CSRF: токен приходит в cookie `XSRF-TOKEN`, клиент возвращает его в заголовке `X-XSRF-TOKEN`.
- Выход `POST /api/auth/logout` работает средствами Spring Security и отвечает 204.
- Ошибки 401 и 403, в том числе из фильтров Spring Security, приходят в том же формате ProblemDetail, что и остальные.

## Ошибки

`common/ApiExceptionHandler` отдаёт все ошибки в формате ProblemDetail:

| Ситуация | Код |
|---|---|
| ошибка в полях запроса, тексты по полям в `errors` | 400 |
| нет входа | 401 |
| нет прав, чужие данные, своё достижение на проверке, нет CSRF-токена | 403 |
| `NotFoundException` | 404 |
| `ConflictException`: статус не позволяет действие, период закрыт, периоды пересекаются, дубль | 409 |
| непредвиденная ошибка, подробности только в логе | 500 |

## API и Swagger

- Список адресов — [api.md](api.md), поля запросов и ответов — `app/src/main/resources/static/openapi.yaml` (OpenAPI 3.1). Эти два файла меняются вместе.
- Swagger UI: `/swagger-ui.html`. На вкладке «Контракт API» — все методы контракта, на вкладке «Реализовано в коде» — то, что есть в контроллерах.
- `GET /api/health` отдаёт Spring Boot Actuator, он проверяет и подключение к базе.

## Клиент

Клиент React живёт отдельно от Java-кода: собирается командой `npm run build` в статические файлы, их раздаёт nginx в контейнере `frontend`.

- nginx пересылает в бэкенд `/api`, Swagger (`/swagger-ui`, `/v3/api-docs`) и `/openapi.yaml`. Для браузера сайт и API живут на одном адресе, поэтому CORS не нужен, cookie сессии и CSRF работают без настройки.
- Любой другой адрес (`/admin/users`, `/reports`) nginx отдаёт как `index.html`, экран выбирает React Router.
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
- Файлы к достижениям лежат в томе `uploads`, путь передаётся переменной `APP_STORAGE_DIR` (`app.storage.dir`).
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
        │   │   └── AuditRecorded.java        событие для журнала аудита
        │   ├── user/          User, Role, Category, Department, Program, RoleAssignment, репозитории, мапперы,
        │   │                  контроллеры, UserRequest, LoginRequest, UserDto, PersonShort, UserService
        │   ├── indicator/     Indicator, IndicatorVersion, IndicatorRepository, IndicatorMapper, IndicatorController,
        │   │                  IndicatorRequest, IndicatorDto, IndicatorService
        │   ├── period/        Period, PeriodType, PeriodRepository, PeriodMapper, PeriodController,
        │   │                  PeriodRequest, PeriodDto, PeriodService, PeriodClosed
        │   ├── achievement/   Achievement, Participant, Decision, ResultStatus, ShareCalculator, IdentifierNormalizer,
        │   │                  репозитории, мапперы, AchievementController, AchievementRequest, AchievementDto,
        │   │                  AchievementService, AchievementApproved, AchievementRejected,
        │   │                  evidence/ (Evidence, EvidenceRepository, EvidenceController, FileStorage, EvidenceDto)
        │   ├── scoring/       Accrual, Score, PeriodSnapshot, репозитории, ScoreCalculator, слушатели событий,
        │   │                  ScoreDto, ScoringService
        │   ├── report/        ScoresController, DashboardController, ReportController, XlsxWriter, ReportService, DTO
        │   ├── measurement/   Measurement, MeasurementRepository, MeasurementMapper, MeasurementController,
        │   │                  MeasurementRequest, MeasurementDto, MeasurementService
        │   ├── audit/         AuditEvent, AuditRepository, AuditListener, AuditController, AuditEventDto
        │   └── importing/     ImportJob, ImportRow, репозитории, ImportController, разбор наборов, ImportJobDto, ImportService
        ├── main/resources/
        │   ├── application.yml           база из DB_URL, DB_USER, DB_PASSWORD; файлы в APP_STORAGE_DIR
        │   ├── application-dev.yml       локальная база и тестовые данные
        │   ├── db/migration/             миграции Flyway V100–V999
        │   ├── db/seed/                  тестовые данные
        │   └── static/openapi.yaml       контракт API для Swagger UI
        └── test/java/ru/fa/kpi/
            ├── ModularityTest.java           границы пакетов
            ├── KpiApplicationTests.java      приложение целиком на PostgreSQL в Docker
            ├── TestcontainersConfiguration.java
            ├── common/                       SecurityConfigTest, ApiExceptionHandlerTest
            └── user/, indicator/, …          тесты пакетов
```
