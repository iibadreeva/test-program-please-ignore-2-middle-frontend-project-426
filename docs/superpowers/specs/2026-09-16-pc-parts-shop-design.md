# Design: PC Parts Shop (Next.js monolith)

Date: 2026-09-16

## Goal

Интернет-магазин комплектующих для ПК: главная с промо, каталог с фильтрами и пагинацией, карточка товара, корзина, регистрация/вход, оформление заказа (доставка или самовывоз), личный кабинет с историей заказов.

Проверка смотрит на поведение в браузере. API проектируем сами и сами же потребляем. Приложение деплоится в прод с третьего шага.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend + API | Next.js App Router (monolith), TypeScript strict |
| DB | Postgres (Neon / Supabase) |
| ORM | Prisma |
| Auth | Custom: bcryptjs + jose JWT in httpOnly cookie |
| Styles | Tailwind CSS + own components; shadcn/ui when needed |
| Validation | zod; react-hook-form + @hookform/resolvers |
| API contract | TypeSpec → OpenAPI (`api/main.tsp`) |
| Tests | Playwright (e2e), Vitest + Testing Library (unit) |
| Deploy | Vercel |

Not used: TanStack Query, Zustand, NextAuth.

## Architecture

Business logic lives in `src/server/services/*`. REST route handlers and Server Components / Server Actions are thin adapters over the same services.

```
Browser
  → Server Components (read)
  → Server Actions (mutations)
  → REST /api/** (contract + external consumers)
       ↓
  Services (catalog, cart, orders, auth)
       ↓
  Prisma → Postgres
```

## Domain rules

1. **Cart** is a mutable draft. One cart per user or guest (`cart_id` cookie). Survives reload. Guest cart merges into user cart on login/register.
2. **Order** is an immutable historical document. `OrderItem` stores snapshots (`titleSnapshot`, `priceCentsSnapshot`, `imageUrlSnapshot`). Price changes after purchase must not alter past orders.
3. Checkout is one Prisma transaction: recompute totals from current product prices → create order + snapshot items → clear cart.
4. Money is stored as integer cents (`priceCents`), never float.

## Data model

- `User` — email (unique), passwordHash, name
- `Category`, `Brand` — slug + name
- `Product` — slug, title, description, priceCents, oldPriceCents?, imageUrl, stock, rating, specs (Json), categoryId, brandId
- `Cart` — userId? (unique when set)
- `CartItem` — cartId, productId, quantity (unique on cartId+productId)
- `Order` — userId, status, deliveryType (DELIVERY | PICKUP), address?, pickupPointId?, recipientName, phone, comment?, totalCents
- `OrderItem` — orderId, productId?, snapshots, quantity
- `PickupPoint` — name, address

## API surface

- Auth: `POST /api/auth/register|login|logout`, `GET /api/auth/me`
- Catalog: `GET /api/categories|brands|products|products/{slug}` (products support category, brand, minPrice, maxPrice, search, sort, page, perPage)
- Cart: `GET /api/cart`, `POST /api/cart/items`, `PATCH|DELETE /api/cart/items/{id}`, `DELETE /api/cart`
- Orders: `POST /api/orders`, `GET /api/orders`, `GET /api/orders/{id}`
- Pickup: `GET /api/pickup-points`

Error shape: `{ error: { code, message, details? } }` with 400 / 401 / 404.

## Routes

`/`, `/catalog`, `/products/[slug]`, `/cart`, `/checkout`, `/login`, `/register`, `/account`, `/account/orders`, `/account/orders/[id]`.

Catalog filters live in URL `searchParams` (shareable, reload-safe).

## Project layout

```
prisma/schema.prisma, prisma/seed.ts
api/main.tsp
src/app/          # pages, layout, api route handlers
src/server/       # db, auth, services
src/features/     # catalog-filters, add-to-cart, auth-forms, checkout-form
src/components/   # ui + shared blocks
src/shared/       # types, zod schemas, formatters
e2e/              # Playwright
```

## Delivery steps

1. Init Next.js + Tailwind + tooling
2. TypeSpec contract + Prisma schema + seed
3. Early deploy (Vercel + Neon) — empty shell in production
4. Catalog (home promos, filters, product page)
5. Cart
6. Auth + guest cart merge
7. Checkout
8. Account / order history
9. Playwright e2e + polish

## data-testid

Official Hexlet checklist not yet in the repo. Until it arrives, use a consistent convention (`product-card`, `cart-item`, `add-to-cart-button`, etc.) and remap when the checklist is provided.

## Visual direction (shop)

Subject: PC components store. Audience: people building / upgrading PCs.

Palette (working tokens):

- `--bg`: `#0c1118` (deep graphite, not pure black)
- `--surface`: `#151c27`
- `--text`: `#e8edf5`
- `--muted`: `#8b97a8`
- `--accent`: `#3dd6c6` (cool cyan-teal — hardware / PCB feel)
- `--warn`: `#f0a46a`

Type: display — Space Grotesk; body — IBM Plex Sans; data/prices — IBM Plex Mono.

Signature: full-bleed dark hero with a single large product silhouette / promo strip and brand name as the dominant first-viewport signal; catalog is dense and technical, not card-heavy marketing collage.
