# 🛒 HexParts — Интернет-магазин комплектующих для ПК

[![hexlet-check](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions)
![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

**HexParts** — современный полнофункциональный интернет-магазин компьютерных комплектующих на **Next.js (App Router)**. Включает интерактивный каталог товаров с гибкими фильтрами, корзину, оформление заказов с выбором доставки или самовывоза, личный кабинет и полноценный REST API поверх Prisma ORM и PostgreSQL.

### 🔗 Демо

**Приложение развёрнуто на Render:** [test-program-please-ignore-2-middle.onrender.com](https://test-program-please-ignore-2-middle.onrender.com/)

- 🩺 **Health Check:** [/api/health](https://test-program-please-ignore-2-middle.onrender.com/api/health)

> ⏳ Сервис работает на бесплатном тарифе и засыпает при простое — первый запрос после паузы может занять до минуты.

> 🎓 **Учебный проект Хекслета**: [Программа «Фронтенд-разработчик (Middle)»](https://ru.hexlet.io/programs/test-program-please-ignore-2-middle-frontend)

---

### 🌟 Основные возможности

- 🔍 **Каталог и поиск:** фильтрация по категориям/параметрам, сортировка, поиск в реальном времени и пагинация.
- 🛍️ **Корзина:** сквозная работа с корзиной (гостевая корзина + автоматический merge при авторизации).
- 🔐 **Аутентификация:** регистрация, вход, безопасная работа с JWT-токенами в `httpOnly` cookie.
- 📦 **Оформление заказа:** поддержка курьерской доставки и пунктов самовывоза.
- 👤 **Личный кабинет:** история и детальный статус оформленных заказов.
- 🩺 **Health Check:** эндпоинт `GET /api/health` — проверка, что процесс жив и PostgreSQL отвечает (см. ниже).

---

### 🩺 Health Check (`GET /api/health`)

Эндпоинт для CI, деплоя и мониторинга: показывает, что Next.js слушает порт **и** до Postgres можно достучаться.

Реализация: `src/app/api/health/route.ts`.

| Результат     | HTTP  | Тело                                               | Когда                          |
| :------------ | :---: | :------------------------------------------------- | :----------------------------- |
| ОК            | `200` | `{ "status": "ok" }`                               | `SELECT 1` к БД прошёл успешно |
| БД недоступна | `503` | ошибка `INTERNAL_ERROR` («База данных недоступна») | нет соединения / ошибка Prisma |

- Ответ **не кэшируется** (`dynamic = "force-dynamic"`) — каждый запрос выполняется заново.
- Пример: [http://localhost:3000/api/health](http://localhost:3000/api/health)

> Это HTTP-проверка приложения. Отдельно в `docker-compose.yml` у сервиса `db` есть Compose-`healthcheck` (`pg_isready`) — он нужен, чтобы контейнер `app` стартовал только после готовности Postgres.

---

### 🛠️ Стек технологий

- **Frontend:** [React](https://react.dev/), [Next.js](https://nextjs.org/) (App Router, Server Components & Server Actions), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/), [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend & API:** [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), [TypeSpec](https://typespec.io/) → [OpenAPI 3.0](https://www.openapis.org/)
- **База данных & ORM:** [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/)
- **Безопасность:** [`jose`](https://github.com/panva/jose) (JWT), [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) (хеширование паролей)
- **Мониторинг:** [Sentry](https://sentry.io/) (`@sentry/nextjs` — фронтенд и бэкенд)
- **Тестирование & CI:** [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/), [GitHub Actions](https://docs.github.com/en/actions)
- **Инфраструктура:** [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) (Multi-stage build), [Render](https://render.com/) (деплой и managed PostgreSQL)

---

### 📋 Контракт запуска и переменные окружения

Приложение упаковывается в единый Docker-образ и обслуживает UI и REST API (`/api/*`) на одном порту через `0.0.0.0:$PORT`.

| Переменная               | Обязательная | Описание / Пример                                                                    |
| :----------------------- | :----------: | :----------------------------------------------------------------------------------- |
| `PORT`                   |      ❌      | Порт HTTP-сервера (по умолчанию `3000`)                                              |
| `DATABASE_URL`           |      ✅      | Строка подключения к PostgreSQL (`postgresql://user:pass@host:5432/db`)              |
| `JWT_SECRET`             |      ❌      | Ключ подписи JWT (≥ 16 симв.). Если не задан — безопасно выводится из `DATABASE_URL` |
| `NEXT_PUBLIC_SENTRY_DSN` |      ❌\*     | DSN проекта Sentry (фронтенд + fallback для бэкенда)                                 |
| `SENTRY_DSN`             |      ❌      | Опциональный DSN только для сервера (иначе берётся `NEXT_PUBLIC_SENTRY_DSN`)         |
| `SENTRY_AUTH_TOKEN`      |      ❌\*     | Токен загрузки source maps при `next build` (не коммитить)                           |

> \* Нужны для мониторинга ошибок на проде. Значения задаются в переменных окружения хостинга, не в коде.

> ℹ️ **Автоматические миграции и сид:**  
> При старте контейнера скрипт `docker-entrypoint.sh` автоматически дожидается готовности PostgreSQL, применяет миграции (`prisma migrate deploy`) и выполняет идемпотентное наполнение каталога.

---

### 🚀 Быстрый старт

#### Вариант 1: Запуск через Docker Compose (Рекомендуемый)

Убедитесь, что у вас запущен Docker Desktop / Docker Engine:

```bash
# Клонирование репозитория
git clone https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426.git
cd test-program-please-ignore-2-middle-frontend-project-426

# Запуск приложения и базы данных
docker compose up --build
```

- 🌐 **Приложение:** [http://localhost:3000](http://localhost:3000)
- 🩺 **Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)
- 🗄️ **PostgreSQL:** `localhost:5432` (`hexparts` / `hexparts`, БД: `pc_parts_shop`)

---

#### Вариант 2: Локальная разработка

1. **Установка зависимостей и настройка окружения:**

   ```bash
   npm install
   cp .env.example .env
   ```

2. **Запуск базы данных в Docker:**

   ```bash
   docker compose up -d db
   ```

3. **Применение миграций и сидирование данных:**

   ```bash
   npm run db:deploy
   npm run db:seed
   ```

4. **Запуск dev-сервера:**
   ```bash
   npm run dev
   ```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

---

### 📜 Доступные npm-скрипты

| Скрипт                | Описание                                                        |
| :-------------------- | :-------------------------------------------------------------- |
| `npm run dev`         | Запуск сервера разработки с Hot-Reload                          |
| `npm run build`       | Production-сборка приложения Next.js                            |
| `npm start`           | Запуск собранного production-сервера                            |
| `npm run typecheck`   | Проверка типов TypeScript (фронтенд + скрипты)                  |
| `npm run db:deploy`   | Применение миграций Prisma к базе данных                        |
| `npm run db:migrate`  | Создание новой миграции в процессе разработки                   |
| `npm run db:seed`     | Идемпотентное наполнение каталога тестовыми данными             |
| `npm run seed:build`  | Сборка standalone-скрипта сида для Docker-образа                |
| `npm run tsp:compile` | Компиляция спецификации TypeSpec в OpenAPI (`api/openapi.yaml`) |
| `npm test`            | Запуск модульных тестов Vitest                                  |
| `npm run test:e2e`    | Запуск сквозных E2E-тестов Playwright                           |

---

### 🏗️ Архитектура проекта

```text
├── api/                  # TypeSpec спецификации API и сгенерированный openapi.yaml
├── prisma/               # Схема БД, SQL-миграции и сид-скрипты
├── public/               # Статические ассеты и изображения
├── src/
│   ├── app/              # Next.js App Router (страницы и Route Handlers /api/*)
│   ├── components/       # UI-компоненты (каталог, корзина, шапка, футер)
│   ├── lib/              # Утилиты, клиенты и общие хелперы
│   └── server/           # Серверный слой: сервисы, Prisma-клиент, JWT и авторизация
├── Dockerfile            # Многоэтапная оптимизированная сборка контейнера
├── docker-compose.yml    # Конфигурация локального окружения с PostgreSQL
└── docker-entrypoint.sh  # Точка входа контейнера (healthcheck БД, миграции, сид, старт)
```

---

<details>
<summary><b>🤖 Автоматические тесты Хекслета</b></summary>
<br>

Тесты запускаются автоматически на каждый push/PR. За запуск отвечает workflow `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте этот файл и репозиторий.
</details>

---

### 🎓 О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования с практическими проектами, код-ревью и поддержкой наставников. Данный репозиторий разработан в рамках проектного обучения.
