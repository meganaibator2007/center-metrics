# Архитектура center-metrics

Статус: структура согласована 07.11.2026, каркас собран в ветке `skeleton-project`.
Общие правила стека и кода — в [техсоглашениях](TECH_AGREEMENTS.md) (PR #123), список адресов API — в [api.md](api.md).

## Коротко

Одно приложение Spring Boot: один jar, один процесс, одна база PostgreSQL. Это модульный монолит: код разделён на пакеты по фичам, и каждый пакет можно позже выделить в отдельный сервис.

Maven-модулей два:

| Модуль | Что внутри |
|---|---|
| `app` | весь Java-код, настройки, миграции, тесты |
| `frontend` | клиент React (каркас в PR #126). План: добавить `frontend/pom.xml` и `<module>frontend</module>` в корневой `pom.xml`, тогда Maven сам соберёт клиент через Vite и положит его в jar `app` по пути `static/` |

## Пакеты

Пакеты лежат в `app/src/main/java/ru/fa/kpi/`.

| Пакет | За что отвечает | Таблицы | Миграции |
|---|---|---|---|
| `common` | безопасность, формат ошибок, отдача клиента, общие события | — | — |
| `user` | пользователи, роли, вход и выход, смена пароля | `usr_` | V100–V199 |
| `indicator` | категории, показатели, коэффициент, максимальный балл, архив, поля формы | `ind_` | V200–V299 |
| `period` | отчётные периоды, проверка пересечения дат, закрытие | `per_` | V300–V399 |
| `entry` | записи преподавателя и файлы (подпакет `attachment`) | `ent_` | V400–V499 |
| `scoring` | баллы: значение × коэффициент, но не больше максимума | `scr_` | V500–V599 |
| `report` | кабинет, отправка отчёта, отчёт преподавателя, сводный отчёт, контроль сдачи | `rep_` | V600–V699 |

В каждом пакете лежит `package-info.java`: в нём описание пакета и список пакетов, от которых ему разрешено зависеть.

## Кто от кого зависит

```
user    indicator    period          ни от кого, кроме common
   ↑        ↑          ↑
   └───── entry ───────┘             проверяет: период открыт, отчёт не отправлен
            │ событие EntrySaved
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

- `EntrySaved` лежит в `entry`. `scoring` слушает его синхронно (`@EventListener`) в той же транзакции, поэтому баллы обновляются сразу после сохранения записи.
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
- Swagger UI: http://localhost:8080/swagger-ui.html. На вкладке «Контракт API» — все запланированные методы, на вкладке «Реализовано в коде» — то, что уже есть в контроллерах.
- `GET /api/health` отдаёт Spring Boot Actuator, он проверяет и подключение к базе. Отдельный `HealthController` не нужен.

## Клиент в jar

`common/SpaConfig` отдаёт файлы клиента из `classpath:/static/`. Если файла нет, а адрес похож на экран клиента (`/admin/users`, `/cabinet`), отдаётся `index.html`, и экран выбирает React Router. Адреса `/api` и файлы с расширением не подменяются: для них остаётся 404.

## Docker

`Dockerfile` собирает jar сам, в два этапа: сначала образ с JDK запускает `./mvnw package`, потом готовый jar копируется в лёгкий образ с JRE. Иначе на чистом компьютере `docker compose up` не соберётся, потому что `app/target` там пустой. Node.js отдельно ставить не нужно, клиент собирает Maven-плагин. Dockerfile и `docker-compose.yml` — отдельная задача.

## Файловая структура

Отметка «план» — файлы, которых в каркасе ещё нет.

```
center-metrics/
├── pom.xml                       родитель: Spring Boot 4.1.2, Java 25, модули
├── mvnw, mvnw.cmd, .mvn/         Maven Wrapper 3.9.16
├── .gitignore, .gitattributes
├── README.md
├── Dockerfile, docker-compose.yml, .env.example    план
├── .github/                      шаблоны и CI, план
├── docs/
│   ├── TECH_AGREEMENTS.md        PR #123
│   ├── ARCHITECTURE.md           этот файл
│   ├── api.md                    список адресов API
│   └── adr/
├── frontend/                     клиент React, PR #126
└── app/
    ├── pom.xml
    └── src/
        ├── main/java/ru/fa/kpi/
        │   ├── KpiApplication.java
        │   ├── common/
        │   │   ├── SecurityConfig.java       сессия, CSRF, 401/403, выход
        │   │   ├── CsrfController.java       GET /api/auth/csrf
        │   │   ├── ApiExceptionHandler.java  ошибки в формате ProblemDetail
        │   │   ├── NotFoundException.java, ConflictException.java
        │   │   ├── SpaConfig.java            index.html для экранов клиента
        │   │   └── ReportSubmitted.java, ReportReturned.java
        │   ├── user/          package-info.java; план: User, Role, UserRepository, UserMapper,
        │   │                  UserController, AuthController, UserRequest, LoginRequest, UserDto, UserService
        │   ├── indicator/     package-info.java; план: Indicator, Category, репозитории, мапперы,
        │   │                  контроллеры, IndicatorRequest, CategoryRequest, IndicatorDto, CategoryDto, IndicatorService
        │   ├── period/        package-info.java; план: Period, PeriodType, PeriodRepository, PeriodMapper,
        │   │                  PeriodController, PeriodRequest, PeriodDto, PeriodService
        │   ├── entry/         package-info.java; план: Entry, EntryRepository, EntryMapper, EntryController,
        │   │                  EntryRequest, EntryDto, EntryService, EntrySaved, ReportEventsListener,
        │   │                  attachment/ (Attachment, AttachmentRepository, AttachmentController, FileStorage, AttachmentDto)
        │   ├── scoring/       package-info.java; план: Score, ScoreRepository, ScoreCalculator,
        │   │                  EntrySavedListener, ScoreDto, ScoringService
        │   └── report/        package-info.java; план: Report, ReportStatus, ReportRepository, ReportMapper,
        │                      ReportController, CabinetController, ReportDto, SummaryRowDto, ControlRowDto,
        │                      CabinetDto, ReportService
        ├── main/resources/
        │   ├── application.yml           база из переменных DB_URL, DB_USER, DB_PASSWORD
        │   ├── application-dev.yml       локальная база и тестовые данные
        │   ├── db/migration/             V100__user_create_tables.sql … V600__report_create_tables.sql, план
        │   ├── db/seed/                  тестовые данные, план
        │   └── static/openapi.yaml       контракт API для Swagger UI
        └── test/
            ├── java/ru/fa/kpi/
            │   ├── ModularityTest.java           границы пакетов
            │   ├── KpiApplicationTests.java      приложение целиком на PostgreSQL в Docker
            │   ├── TestcontainersConfiguration.java
            │   ├── common/                       SecurityConfigTest, ApiExceptionHandlerTest, SpaConfigTest
            │   └── user/, indicator/, …          план: тесты пакетов
            └── resources/static/index.html       заглушка клиента для SpaConfigTest
```

## Журнал решений

| Дата | Решение | Почему |
|---|---|---|
| 07.11 | Два Maven-модуля `app` и `frontend` вместо модуля на каждый пакет | один запускаемый jar, границы пакетов проверяет Spring Modulith |
| 07.11 | Ручные мапперы вместо MapStruct | так учили на курсе, меньше новых технологий; правило переноса полей выше |
| 07.11 | События `ReportSubmitted` и `ReportReturned` в `common` | убирают цикл `entry` ↔ `report` |
| 07.11 | Диапазоны номеров миграций и `out-of-order: true` | пакеты пишут миграции независимо |
| 07.11 | Кафедра строкой, без `/api/departments` | проще для MVP, на клиенте уже строка |
| 07.11 | Dockerfile собирает jar внутри Docker | `docker compose up` должен работать на чистом компьютере |
| 07.11 | `/api/health` через Actuator вместо `HealthController` | меньше своего кода, заодно проверяется база |
| 07.11 | Фильтры `archived` и `closed` вместо `status` у показателей и периодов | совпадают с полями DTO в `frontend/src/api/types.ts` |
