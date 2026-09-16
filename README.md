# Интернет-магазин комплектующих для ПК

[![hexlet-check](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions)

**HexParts** — учебный интернет-магазин на Next.js (App Router): каталог с фильтрами, корзина, регистрация/вход, оформление заказа и личный кабинет. Бэкенд — собственные Route Handlers + Prisma + PostgreSQL.

Учебный проект Хекслета: https://ru.hexlet.io/programs/test-program-please-ignore-2-middle-frontend

## Стек

- TypeScript, Next.js, React
- Prisma + PostgreSQL (например Prisma Postgres / Neon / Supabase)
- Tailwind CSS
- TypeSpec → OpenAPI
- jose + bcryptjs (JWT в `httpOnly` cookie)
- Zustand (клиентский стор корзины поверх серверного API)
- Vitest, Playwright

## Установка

```bash
git clone https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426.git
cd test-program-please-ignore-2-middle-frontend-project-426
npm install
cp .env.example .env
```

В `.env` укажите:

- `DATABASE_URL` — строка подключения к PostgreSQL
- `JWT_SECRET` — случайная строка (≥ 16 символов) для подписи сессий

Затем:

```bash
npx prisma db push
npm run db:seed
npm run dev
```

Приложение: http://localhost:3000

## Скрипты

| Команда | Назначение |
| --- | --- |
| `npm run dev` | локальная разработка |
| `npm run build` / `npm start` | production-сборка |
| `npm run db:push` | синхронизация схемы с БД |
| `npm run db:migrate` | миграции Prisma |
| `npm run db:seed` | наполнение каталога |
| `npm run tsp:compile` | генерация OpenAPI из TypeSpec |
| `npm test` | unit-тесты |
| `npm run test:e2e` | e2e Playwright |

## Возможности

- Главная с промо-блоками
- Каталог: фильтры, поиск, сортировка, пагинация
- Карточка товара и серверная корзина (в том числе для гостя)
- Регистрация / вход / выход, merge гостевой корзины
- Оформление заказа: доставка или самовывоз
- Личный кабинет с историей заказов

## Архитектура

Монолит Next.js: UI (Server Components / Actions) и REST API (`/api/*`) вызывают общий слой сервисов → Prisma → Postgres. Контракт API описан в `api/main.tsp` (сборка: `npm run tsp:compile` → `api/openapi.yaml`).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
