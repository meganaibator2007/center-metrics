# Клиент center-metrics

React, TypeScript и Vite. Почему React — [ADR-02](../docs/adr/ADR-02-react-client.md), правила кода — [техсоглашения](../docs/TECH_AGREEMENTS.md), раздел 3.

## Запуск

Нужен Node.js 24 LTS.

```bash
cd frontend
npm install
npm run dev
```

Клиент откроется на http://localhost:5173.

Пока сервера нет, клиент работает на заглушках (`src/api/mock.ts`, включены в `.env.development`). Вход: `a.ivanova` — преподаватель, `e.smirnova` — администратор, пароль любой.

Чтобы работать с настоящим сервером, запусти Spring Boot на порту 8080 и создай файл `.env.development.local` со строкой `VITE_API_MOCK=false`. Запросы `/api` Vite сам перенаправит на сервер.

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | запуск для разработки, страница обновляется при сохранении |
| `npm run build` | проверка типов и сборка в `dist/` |
| `npm run lint` | проверка кода линтером oxlint |

## Структура

```
src/
├── main.tsx             точка входа
├── routes.tsx           разделы по ТЗ (раздел 10) и проверка ролей
├── api/                 запросы к серверу
│   ├── client.ts        один fetch на всё: CSRF, ProblemDetail, 401 → вход, загрузка файлов
│   ├── types.ts         модель данных по ТЗ — предложение контракта для openapi.yaml
│   ├── mock/            заглушки с правилами ТЗ (доли, маршрут, дубли, цели РОП); в сборку не попадают
│   └── achievements.ts, indicators.ts, periods.ts, org.ts, scores.ts, imports.ts, auth.ts
├── auth/                текущий пользователь, роли (у человека их может быть несколько)
├── lib/                 расчёты (calc.ts), форматирование, подписи, загрузка данных
├── layout/              шапка, меню по ролям, подвал
├── components/          общие компоненты: таблица достижений, выбор периода, поля, бейджи
└── pages/
    ├── home/            главная по ролям, дашборд директора, «Мои показатели»
    ├── achievement/     мои достижения, форма с соавторами, карточка, очереди РОП и директора, реестр
    ├── targets/         целевые показатели РОП
    ├── reports/         отчёты (XLSX — на сервере), аналитика
    ├── admin/           сотрудники, справочник, периоды, импорт, журнал аудита
    └── user/, error/
```

Пользователи заглушек (пароль любой): `a.ivanova`, `p.sokolov` — ППС; `m.petrova`, `n.kozlova` — РОП и ППС;
`d.orlov` — директор; `k.volkova` — АУП; `e.smirnova` — суперадминистратор. Данные живут в sessionStorage вкладки.

## Как перенести экран из прототипа

1. Открой экран в `prototype/index.html` и его HTML в `prototype/templates/`.
2. Создай компонент в `src/pages/<модуль>/`. В разметке `class` меняется на `className`, `for` на `htmlFor`, все теги закрываются.
3. Данные бери через функцию из `src/api/`. Если метода ещё нет на сервере, добавь заглушку в `mock.ts` по `docs/api.md`.
4. В `routes.tsx` замени `PlannedPage` на свой компонент.
5. Перед PR запусти `npm run build` и `npm run lint`.
