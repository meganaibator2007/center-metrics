# Контракт API

> Эндпоинты пока не реализованы. Ниже указано то, что запланировано.

Все адреса API начинаются с `/api`. Формат данных: JSON, ошибки: `ProblemDetail`.
Для всех адресов, кроме входа, получения CSRF-cookie и проверки сервера, нужна сессия.

Запросы, меняющие данные, включая `POST /api/auth/login`, требуют CSRF-токен. Перед входом клиент вызывает `GET /api/auth/csrf`, получает токен в cookie и передаёт его в заголовке запроса.

## Вход и система

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/auth/csrf` | все | Выдача CSRF-cookie перед входом |
| POST | `/api/auth/login` | все | Вход |
| POST | `/api/auth/logout` | вошедшие | Выход |
| GET | `/api/auth/me` | вошедшие | Текущий пользователь |
| GET | `/api/health` | все | Проверка сервера |

## Пользователи

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/users?q=&role=&departmentId=&active=&page=` | админ | Список пользователей |
| POST | `/api/users` | админ | Создание пользователя |
| GET | `/api/users/{id}` | админ | Карточка пользователя |
| PUT | `/api/users/{id}` | админ | Изменение пользователя |
| PATCH | `/api/users/{id}/active` | админ | Блокировка и разблокировка |
| GET | `/api/departments` | админ | Кафедры для форм и фильтров |

## Категории и показатели

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/categories` | вошедшие | Список категорий |
| POST | `/api/categories` | админ | Создание категории |
| PUT | `/api/categories/{id}` | админ | Изменение категории |
| GET | `/api/indicators?categoryId=&q=&status=&required=` | вошедшие | Список показателей |
| GET | `/api/indicators/{id}` | вошедшие | Карточка показателя |
| POST | `/api/indicators` | админ | Создание показателя |
| PUT | `/api/indicators/{id}` | админ | Изменение показателя |
| POST | `/api/indicators/{id}/archive` | админ | Перенос показателя в архив |

## Отчётные периоды

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/periods?status=` | вошедшие | Список периодов |
| POST | `/api/periods` | админ | Создание периода, 409 при пересечении дат |
| PUT | `/api/periods/{id}` | админ | Изменение периода |
| POST | `/api/periods/{id}/close` | админ | Закрытие периода |

## Записи и файлы

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/entries?periodId=&indicatorId=` | преподаватель | Свои записи |
| GET | `/api/entries/{id}` | преподаватель | Одна запись |
| POST | `/api/entries` | преподаватель | Создание записи |
| PUT | `/api/entries/{id}` | преподаватель | Изменение записи |
| DELETE | `/api/entries/{id}` | преподаватель | Удаление записи |
| POST | `/api/entries/{id}/attachments` | преподаватель | Загрузка файла: pdf, jpg, png до 10 МБ |
| GET | `/api/attachments/{id}` | владелец, админ | Скачивание файла |
| DELETE | `/api/attachments/{id}` | владелец | Удаление файла |

## Кабинет и отчёты

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/cabinet?periodId=` | преподаватель | Показатели, заполненность, сумма баллов |
| GET | `/api/reports/my?periodId=` | преподаватель | Свой отчёт |
| POST | `/api/reports/my/submit?periodId=` | преподаватель | Отправка отчёта, 409 без обязательных показателей |
| GET | `/api/reports/teachers/{teacherId}?periodId=` | админ | Отчёт преподавателя |
| GET | `/api/reports/summary?periodId=&departmentId=&status=&sort=` | админ | Сводный отчёт и рейтинг |
| GET | `/api/reports/control?periodId=&status=` | админ | Контроль сдачи |

## После защиты

| Метод | Адрес | Доступ | Назначение |
|---|---|---|---|
| POST | `/api/auth/password` | вошедшие | Смена пароля |
| PUT | `/api/indicators/{id}/fields` | админ | Настройка полей показателя |
| POST | `/api/reports/{id}/accept` | админ | Приёмка отчёта |
| POST | `/api/reports/{id}/return` | админ | Возврат отчёта с комментарием |
| GET | `/api/reports/summary/export?format=` | админ | Экспорт в PDF или Excel |
| GET | `/api/dashboard?periodId=` | админ | Данные дашборда |
