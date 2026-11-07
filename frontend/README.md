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
├── routes.tsx           все адреса и проверка ролей
├── api/                 запросы к серверу
│   ├── client.ts        один fetch на всё: CSRF-токен, ошибки ProblemDetail
│   ├── mock.ts          заглушки, пока нет сервера
│   ├── types.ts         формы данных = схемы из openapi.yaml
│   └── auth.ts, indicator.ts, period.ts, report.ts
├── auth/                текущий пользователь, проверка роли
├── layout/              шапка, меню роли, подвал
├── components/          общие компоненты
├── pages/<модуль>/      экраны: user, indicator, period, entry, report, error
└── styles/main.css      стили по брендбуку, перенесены из прототипа
```

## Как перенести экран из прототипа

1. Открой экран в `prototype/index.html` и его HTML в `prototype/templates/`.
2. Создай компонент в `src/pages/<модуль>/`. В разметке `class` меняется на `className`, `for` на `htmlFor`, все теги закрываются.
3. Данные бери через функцию из `src/api/`. Если метода ещё нет на сервере, добавь заглушку в `mock.ts` по `docs/api.md`.
4. В `routes.tsx` замени `PlannedPage` на свой компонент.
5. Перед PR запусти `npm run build` и `npm run lint`.
