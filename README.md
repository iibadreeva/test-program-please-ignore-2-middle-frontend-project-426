# 🛒 HexParts — Интернет-магазин комплектующих для ПК

[![hexlet-check](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions)
[![CI](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions/workflows/ci.yml/badge.svg)](https://github.com/iibadreeva/test-program-please-ignore-2-middle-frontend-project-426/actions/workflows/ci.yml)
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

- 🏠 **Главная:** описание магазина и промо-блоки из базы, каждый ведёт на карточку доступного товара (см. [Главная](#-главная)).
- 🔍 **Каталог и поиск:** серверная фильтрация по категории, цене, наличию и названию, сортировка и пагинация; состояние выдачи живёт в адресе страницы (см. [Каталог](#-каталог)).
- 🛍️ **Корзина:** состав в `localStorage` (только `productId` и количество), цены и названия каждый раз из каталога (см. [Корзина](#-корзина)).
- 🔐 **Аутентификация:** регистрация, вход, безопасная работа с JWT-токенами в `httpOnly` cookie.
- 📦 **Оформление заказа:** доставка или самовывоз; сервер сам считает итог и отклоняет заказ целиком при недоступном товаре (см. [Заказы и личный кабинет](#-заказы-и-личный-кабинет)).
- 👤 **Личный кабинет:** история своих заказов со снимком цен на момент покупки.
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

### 🛍️ Каталог

Страница `/catalog` — две колонки: панель фильтров слева, выдача справа. На узких экранах панель разворачивается над списком.

#### Фильтрация и пагинация — на сервере

Выборка целиком выполняется в Postgres: браузер получает только текущую страницу. Параметры описаны в спецификации (`GET /products` в [api/main.tsp](api/main.tsp)) и валидируются Zod-схемой `listProductsQuerySchema` из `src/shared/api-contract.ts` — строка запроса нигде не разбирается вручную.

| Параметр                | Тип                                                   | Описание                                                     |
| :---------------------- | :---------------------------------------------------- | :----------------------------------------------------------- |
| `category`              | слаг категории                                        | Пустое значение — все категории                              |
| `brand`                 | слаг бренда                                           | Пустое значение — все бренды                                 |
| `minPrice` / `maxPrice` | целые рубли ≥ 0                                       | Границы диапазона, каждая независима                         |
| `available`             | `true` / `false`                                      | `true` оставляет только товары с остатком больше нуля        |
| `search`                | строка                                                | Поиск по названию, без учёта регистра                        |
| `sort`                  | `newest` / `price_asc` / `price_desc` / `rating_desc` | По умолчанию `newest`                                        |
| `page`                  | целое ≥ 1                                             | Страница за пределами диапазона клампится к последней        |
| `perPage`               | целое 1…48                                            | По умолчанию 12                                              |

Фильтры комбинируются. Сортировка всегда дополняется ключом `id` — без этого страницы «плывут», потому что у сидированных товаров совпадают `createdAt` и цены.

#### Состояние выдачи — в адресе

Источник правды для запроса — строка адреса, поэтому перезагрузка восстанавливает выдачу, кнопки «назад»/«вперёд» работают, а ссылкой на отфильтрованную выдачу можно поделиться. Контролы при этом держат локальное состояние и отзываются мгновенно, а запрос уходит с задержкой 300 мс: пять нажатых букв дают одну навигацию, а не пять. Смена любого фильтра сбрасывает номер страницы.

Перевод между адресом и контролами живёт в одном месте — `src/features/catalog/filters-state.ts`, — поэтому ссылки пагинации и панель фильтров не могут разойтись.

#### Доступность и изображения

Доступность выводится из остатка (`stock > 0`) — так же её понимают корзина и заказы. Недоступный товар из каталога не исчезает: он остаётся в списке с пометкой «Нет в наличии» и атрибутом `data-available="false"`. В корзину его добавить нельзя.

Если у товара нет изображения (`imageUrl: null`), карточка показывает заглушку `public/product-placeholder.svg`. Компонент `ProductImage` подставляет её и при ошибке загрузки, поэтому сломанной картинки не будет и без доступа к внешнему хосту.

#### Данные каталога (сид)

`prisma/seed.ts` идемпотентен: работает через `upsert` под advisory-lock Postgres, повторный запуск не создаёт дубли. Наполнение гарантирует 9 категорий и 88 товаров (минимум 8 в каждой категории), 8 страниц при `perPage=12`, цены от 690 до 219 990 ₽, ровно один товар без изображения и один недоступный. Остатки при повторном запуске не перезатираются, кроме товаров, у которых остаток закреплён демо-данными.

#### Атрибуты `data-testid`

| Элемент                             | Описание                                                            |
| :---------------------------------- | :------------------------------------------------------------------ |
| `nav-catalog`                       | Ссылка в каталог в шапке, видна с любой страницы                    |
| `catalog-list`                      | Контейнер списка товаров                                            |
| `catalog-item`                      | Карточка товара в списке                                            |
| `catalog-item-name`                 | Название товара; ссылка на страницу товара                          |
| `catalog-item-price`                | Цена товара                                                         |
| `catalog-item-description`          | Краткое описание                                                    |
| `catalog-item-image`                | Изображение; `data-placeholder` показывает, отрисована ли заглушка   |
| `catalog-item-availability`         | Доступность; дублируется атрибутом `data-available` (`true`/`false`) |
| `catalog-empty`                     | Состояние «под фильтры ничего не подошло»                           |
| `catalog-total`                     | Число найденных товаров                                             |
| `catalog-filters`                   | Панель фильтров со всеми контролами                                 |
| `filter-category`                   | Выбор категории; значения опций — слаги, пустое значение — все       |
| `filter-brand`                      | Выбор бренда                                                        |
| `filter-price-min` / `-max`         | Границы диапазона цены                                              |
| `filter-available`                  | Чекбокс «только в наличии»                                          |
| `filter-search`                     | Поиск по названию                                                   |
| `filter-sort`                       | Сортировка                                                          |
| `filter-reset`                      | Сброс фильтров                                                      |
| `catalog-pagination`                | Блок пагинации; присутствует всегда                                 |
| `catalog-page-prev` / `-next`       | Переход на предыдущую и следующую страницу                          |
| `catalog-page-current`              | Текущая страница и их общее число                                   |

На краях диапазона `catalog-page-prev` / `catalog-page-next` остаются в разметке, но перестают быть ссылками — уйти на несуществующую страницу нельзя.

---

### 🏠 Главная

Страница `/` — короткий рассказ о магазине и промо-блоки из базы. Тексты и привязка к товару живут в таблице `PromoBlock`, а не в вёрстке: смена акцента не требует правки фронтенда.

Данные отдаёт `GET /api/promos` ([api/main.tsp](api/main.tsp)). Сервис отдаёт только блоки на товары с остатком больше нуля; один товар не может попасть в два блока (`productId` уникален). В ответе товар вложен в блок — отдельный запрос за каждым slug не нужен. Пустой список не ошибка: контейнер остаётся, и с главной по-прежнему можно уйти в каталог.

Сиды добавляют не меньше двух блоков на доступные товары (RTX 4070 SUPER, Ryzen 7 7800X3D, Samsung 990 PRO).

| Элемент           | Описание                                              |
| :---------------- | :---------------------------------------------------- |
| `home-promo`      | Контейнер промо-блоков на главной                     |
| `home-promo-item` | Отдельный промо-блок (ссылка на `/products/{slug}`)   |
| `nav-catalog`     | Ссылка в каталог в шапке, видна с любой страницы      |

---

### 🛒 Корзина

Корзина живёт только в браузере (`localStorage`, ключ `hexparts.cart.v1`): хранятся `productId` и количество. Названия и цены страница корзины каждый раз берёт из каталога через server action `getCartProducts` — отдельного REST `/api/cart` нет. Сервер узнаёт состав только при `POST /api/orders` (поле `items` в теле).

| Элемент              | Описание                                              |
| :------------------- | :---------------------------------------------------- |
| `product-name`       | Название на странице товара                           |
| `product-price`      | Цена на странице товара                               |
| `product-description`| Описание на странице товара                           |
| `product-add-to-cart`| Кнопка «В корзину»                                    |
| `nav-cart`           | Ссылка на корзину в шапке                             |
| `cart-item`          | Позиция в корзине                                     |
| `cart-item-qty`      | Поле количества                                       |
| `cart-item-remove`   | Удаление позиции                                      |
| `cart-total`         | Итоговая сумма (справочная)                           |
| `cart-empty`         | Состояние пустой корзины                              |
| `cart-checkout`      | Переход к оформлению                                  |

---

### 📦 Заказы и личный кабинет

Оформление доступно только авторизованному пользователю. Клиент присылает состав корзины (`productId` + количество) и данные получения — **без цен**. Бэкенд сам находит товары, считает итог по текущим ценам и сохраняет снимок (`titleSnapshot`, `priceSnapshot`) в позициях заказа. Если хотя бы один товар недоступен, заказ отклоняется целиком (`409 ORDER_ITEMS_UNAVAILABLE` с перечнем проблем).

> 💳 **Оплата — заглушка:** отдельного платёжного шлюза нет. Статус сразу «Оплачен» (`paid`) — учебная модель «оформил = оплатил», не реальная эквайринговая сессия.

Способ получения: доставка (адрес обязателен) или самовывоз. Для самовывоза **намеренно** нет выбора пункта выдачи и адреса склада — в заказе остаётся только тип `pickup` (упрощение учебного ТЗ).

После успеха — `/checkout/success?order=…`. Корзина в `localStorage` очищается **в начале** submit (до ответа сервера), чтобы снизить дубли при двойном клике / второй вкладке. Состав дублируется в pending-ключ (`inflight`); при ошибке — откат из snapshot в памяти; при успехе pending помечается `placed` (корзину не восстанавливать, даже если вкладку закрыли до `/checkout/success`); при закрытии вкладки до ответа сервера — `CartHydrator` возвращает корзину из `inflight`.

В кабинете (`/account`) список своих заказов с деталями внутри раскрывающегося элемента. Старый URL `/account/orders/:id` редиректит на `/account?order=:id` и раскрывает нужный заказ. Параметр `next` после логина проходит `resolveLoginNext` (allowlist путей, без `//…`) и сохраняет query (`order`), чтобы не потерять success и deep link.

> 🗄️ **Миграция статусов:** `20260923010000_order_status_paid` переводит все прежние значения `OrderStatus` (включая бывшие `CANCELLED`) в `PAID` **без удаления** строк заказов.

| Элемент                 | Описание                                                                 |
| :---------------------- | :----------------------------------------------------------------------- |
| `checkout-form`         | Форма оформления заказа                                                  |
| `checkout-method`       | Способ получения; значения опций — `delivery` и `pickup`                 |
| `checkout-name`         | Имя получателя                                                           |
| `checkout-phone`        | Телефон                                                                  |
| `checkout-address`      | Адрес доставки (только при `delivery`)                                   |
| `checkout-submit`       | Кнопка оформления                                                        |
| `order-success`         | Страница успешного оформления                                            |
| `order-error`           | Ошибка оформления, включая перечень проблемных товаров                   |
| `order-total`           | Итоговая сумма (страница успеха и кабинет)                               |
| `account-orders`        | Список заказов в личном кабинете                                         |
| `account-order-item`    | Заказ в списке; детали (статус, дата, состав, итог) внутри него          |
| `account-orders-empty`  | Состояние «заказов пока нет»                                             |
| `order-status`          | Статус; дублируется атрибутом `data-status="paid"`                       |

---

### 🛠️ Стек технологий

- **Frontend:** [React](https://react.dev/), [Next.js](https://nextjs.org/) (App Router, Server Components & Server Actions), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/), [Zustand](https://zustand-demo.pmnd.rs/)
- **Backend & API:** [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), [TypeSpec](https://typespec.io/) → [OpenAPI 3.0](https://www.openapis.org/)
- **База данных & ORM:** [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/)
- **Безопасность:** серверные сессии в PostgreSQL (httpOnly cookie), [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) (хеширование паролей)
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
| `BASE_URL`               |      ❌      | Базовый URL для Playwright (`http://localhost:3000`). В CI/проверке Хекслета задаётся снаружи |
| `NEXT_PUBLIC_SENTRY_DSN` |      ❌\*     | DSN проекта Sentry (фронтенд + fallback для бэкенда)                                 |
| `SENTRY_DSN`             |      ❌      | Опциональный DSN только для сервера (иначе берётся `NEXT_PUBLIC_SENTRY_DSN`)         |
| `SENTRY_AUTH_TOKEN`      |      ❌\*     | Токен загрузки source maps при `next build` (не коммитить)                           |

> \* Нужны для мониторинга ошибок на проде. Значения задаются в переменных окружения хостинга, не в коде.

> 🏗️ **Sentry и время сборки:** `NEXT_PUBLIC_SENTRY_DSN` вшивается в клиентский бандл на этапе `next build`, поэтому в `Dockerfile` он объявлен как `ARG` — Render автоматически передаёт переменные окружения сервиса в сборку образа. Без этого фронтенд-часть Sentry остаётся выключенной, даже если переменная задана в рантайме.

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
| `npm run api:types`   | Генерация Zod-схем и типов из OpenAPI (`src/generated/`)        |
| `npm run api:gen`     | Полный цикл: TypeSpec → OpenAPI → типы/схемы                    |
| `npm run api:check`   | Проверка, что сгенерированные артефакты не рассинхронизированы  |
| `npm test`            | Модульные тесты Vitest: проект `node` (сервисы) и `dom` (jsdom) |
| `npm run test:e2e`    | Запуск сквозных E2E-тестов Playwright                           |

---

### 🏗️ Архитектура проекта

```text
├── e2e/                  # Браузерные smoke/e2e-тесты Playwright
├── api/                  # TypeSpec спецификации API и сгенерированный openapi.yaml
├── prisma/               # Схема БД, SQL-миграции и сид-скрипты
├── public/               # Статические ассеты и изображения
├── src/
│   ├── app/              # Next.js App Router (страницы и Route Handlers /api/*)
│   ├── components/       # UI-компоненты (карточка товара, пагинация, шапка)
│   ├── features/         # Клиентские фичи (корзина, фильтры каталога, checkout, auth)
│   ├── generated/        # Типы и Zod-схемы из OpenAPI (не править руками)
│   ├── server/           # Серверный слой: сервисы, Prisma-клиент, сессии и авторизация
│   ├── shared/           # Контрактные хелперы (money, api-contract, format)
│   └── test/             # Общий setup для компонентных тестов (jsdom)
├── Dockerfile            # Многоэтапная оптимизированная сборка контейнера
├── docker-compose.yml    # Конфигурация локального окружения с PostgreSQL
├── playwright.config.ts  # Конфиг Playwright (baseURL из BASE_URL)
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
