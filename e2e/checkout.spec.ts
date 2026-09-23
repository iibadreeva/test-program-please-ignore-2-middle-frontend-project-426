import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const CART_STORAGE_KEY = "hexparts.cart.v1";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerViaUi(page: Page, email: string, password: string, name = "Тест Юзер") {
  await page.goto("/register");
  await expect(page.getByTestId("register-page")).toBeVisible();
  await page.getByTestId("auth-name").fill(name);
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("nav-signout")).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/account/);
}

/**
 * Пишем корзину в localStorage перед навигацией на /checkout.
 * Нельзя сидить до /register|/account: там syncClamped вычистит недоступные refs.
 */
async function seedCartBeforeNextNavigation(
  page: Page,
  refs: { productId: string; quantity: number }[],
) {
  await page.addInitScript(
    ({ key, refs: cartRefs }) => {
      localStorage.setItem(key, JSON.stringify({ state: { refs: cartRefs }, version: 0 }));
    },
    { key: CART_STORAGE_KEY, refs },
  );
}

type ProductSummary = {
  id: string;
  title: string;
  price: string;
  stock: number;
  available: boolean;
};

async function fetchAvailableProduct(request: APIRequestContext): Promise<ProductSummary> {
  // Берём пачку и выбираем с запасом остатка — параллельные e2e не схлопывают один sku в 0.
  const response = await request.get("/api/products?available=true&perPage=24&sort=price_asc");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { items: ProductSummary[] };
  expect(body.items.length).toBeGreaterThan(0);
  const withStock = body.items.find((item) => item.stock >= 5);
  return withStock ?? body.items[0]!;
}

async function fetchUnavailableProduct(request: APIRequestContext): Promise<ProductSummary | null> {
  const response = await request.get("/api/products?available=false&perPage=1");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { items: ProductSummary[] };
  return body.items[0] ?? null;
}

test.describe("оформление заказа", () => {
  test("неавторизованный пользователь не может оформить заказ", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("checkout-form")).toHaveCount(0);
  });

  test("пустую корзину оформить нельзя", async ({ page }) => {
    const email = uniqueEmail("empty-cart");
    await registerViaUi(page, email, "password1");
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-empty")).toBeVisible();
    await expect(page.getByTestId("checkout-form")).toHaveCount(0);
    await expect(page.getByTestId("checkout-submit")).toHaveCount(0);
  });

  test("при доставке адрес обязателен, при самовывозе поле скрыто", async ({ page, request }) => {
    const product = await fetchAvailableProduct(request);
    const email = uniqueEmail("method");
    await registerViaUi(page, email, "password1");
    await seedCartBeforeNextNavigation(page, [{ productId: product.id, quantity: 1 }]);
    await page.goto("/checkout");

    await expect(page.getByTestId("checkout-form")).toBeVisible();
    await expect(page.getByTestId("checkout-method")).toHaveValue("delivery");
    await expect(page.getByTestId("checkout-address")).toBeVisible();

    await page.getByTestId("checkout-method").selectOption("pickup");
    await expect(page.getByTestId("checkout-address")).toHaveCount(0);

    await page.getByTestId("checkout-method").selectOption("delivery");
    await expect(page.getByTestId("checkout-address")).toBeVisible();

    await page.getByTestId("checkout-name").fill("Иван");
    await page.getByTestId("checkout-phone").fill("+79991112233");
    await page.getByTestId("checkout-submit").click();
    await expect(page.getByTestId("order-error")).toBeVisible();
    await expect(page.getByTestId("order-success")).toHaveCount(0);
  });

  test("авторизованный пользователь оформляет заказ и видит страницу успеха", async ({
    page,
    request,
  }) => {
    const product = await fetchAvailableProduct(request);
    const email = uniqueEmail("checkout-ok");
    await registerViaUi(page, email, "password1", "Получатель");
    await seedCartBeforeNextNavigation(page, [{ productId: product.id, quantity: 1 }]);

    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-form")).toBeVisible();
    await page.getByTestId("checkout-method").selectOption("delivery");
    await page.getByTestId("checkout-name").fill("Получатель");
    await page.getByTestId("checkout-phone").fill("+79991112233");
    await page.getByTestId("checkout-address").fill("ул. Тестовая, д. 1");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("order-success")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("order-status")).toHaveAttribute("data-status", "paid");
    await expect(page.getByTestId("order-total")).toBeVisible();
    await expect(page.getByTestId("order-item")).toHaveCount(1);
  });

  test("заказ с недоступным товаром отклоняется целиком", async ({ page, request }) => {
    const unavailable = await fetchUnavailableProduct(request);
    test.skip(!unavailable, "в сиде нет недоступных товаров");

    const email = uniqueEmail("unavailable");
    await registerViaUi(page, email, "password1");
    await seedCartBeforeNextNavigation(page, [
      { productId: unavailable!.id, quantity: 1 },
      { productId: "missing-product-id", quantity: 1 },
    ]);

    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-form")).toBeVisible();
    await page.getByTestId("checkout-method").selectOption("pickup");
    await page.getByTestId("checkout-name").fill("Иван");
    await page.getByTestId("checkout-phone").fill("+79991112233");
    await page.getByTestId("checkout-submit").click();

    await expect(page.getByTestId("order-error")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("order-error")).toContainText(/недоступ|не найден/i);
    await expect(page.getByTestId("order-success")).toHaveCount(0);
  });

  test("итог считается на сервере и не зависит от цен клиента", async ({ page, request }) => {
    const product = await fetchAvailableProduct(request);
    const email = uniqueEmail("server-total");
    const password = "password1";
    await registerViaUi(page, email, password);

    const before = await page.request.get("/api/orders");
    const beforeOrders = (await before.json()) as unknown[];

    const quantity = 2;
    const create = await page.request.post("/api/orders", {
      data: {
        deliveryType: "pickup",
        recipientName: "Иван",
        phone: "+79991112233",
        items: [{ productId: product.id, quantity }],
      },
    });
    expect(create.status()).toBe(201);
    const order = (await create.json()) as {
      total: string;
      items: { priceSnapshot: string; quantity: number; lineTotal: string }[];
    };

    const expectedLine = Number(product.price) * quantity;
    expect(Number(order.total)).toBe(expectedLine);
    expect(Number(order.items[0]!.lineTotal)).toBe(expectedLine);
    expect(Number(order.items[0]!.priceSnapshot)).toBe(Number(product.price));

    const after = await page.request.get("/api/orders");
    const afterOrders = (await after.json()) as unknown[];
    expect(afterOrders.length).toBe(beforeOrders.length + 1);
  });

  test("API атомарно отклоняет недоступные позиции с перечнем", async ({ page, request }) => {
    const unavailable = await fetchUnavailableProduct(request);
    test.skip(!unavailable, "в сиде нет недоступных товаров");

    const email = uniqueEmail("api-atomic");
    await registerViaUi(page, email, "password1");

    const before = await page.request.get("/api/orders");
    const beforeCount = ((await before.json()) as unknown[]).length;

    const create = await page.request.post("/api/orders", {
      data: {
        deliveryType: "pickup",
        recipientName: "Иван",
        phone: "+79991112233",
        items: [
          { productId: unavailable!.id, quantity: 1 },
          { productId: "definitely-missing", quantity: 3 },
        ],
      },
    });
    expect(create.status()).toBe(409);
    const body = (await create.json()) as {
      error: { code: string; details: { productId: string; reason: string }[] };
    };
    expect(body.error.code).toBe("ORDER_ITEMS_UNAVAILABLE");
    expect(body.error.details.length).toBeGreaterThanOrEqual(2);

    const after = await page.request.get("/api/orders");
    expect(((await after.json()) as unknown[]).length).toBe(beforeCount);
  });
});