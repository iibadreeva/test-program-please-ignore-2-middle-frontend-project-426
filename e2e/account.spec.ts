import { test, expect, type Page } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerViaUi(page: Page, email: string, password: string, name = "Тест Юзер") {
  await page.goto("/register");
  await page.getByTestId("auth-name").fill(name);
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("nav-signout")).toBeVisible({ timeout: 15_000 });
}

async function placeOrder(
  page: Page,
  productId: string,
  quantity = 1,
): Promise<{ id: string; total: string; items: unknown[] }> {
  const response = await page.request.post("/api/orders", {
    data: {
      deliveryType: "delivery",
      address: "ул. Кабинетная, 5",
      recipientName: "Клиент",
      phone: "+79990001122",
      items: [{ productId, quantity }],
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test.describe("личный кабинет", () => {
  test("видны только свои заказы; чужие не показываются", async ({ page, request, browser }) => {
    const productRes = await request.get("/api/products?available=true&perPage=1");
    const product = ((await productRes.json()) as { items: { id: string }[] }).items[0]!;

    const emailA = uniqueEmail("owner");
    const emailB = uniqueEmail("other");
    const password = "password1";

    await registerViaUi(page, emailA, password);
    const orderA = await placeOrder(page, product.id);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await registerViaUi(otherPage, emailB, password);
    const orderB = await placeOrder(otherPage, product.id);

    await page.goto("/account");
    await expect(page.getByTestId("account-orders")).toBeVisible();
    const ownItems = page.getByTestId("account-order-item");
    await expect(ownItems).toHaveCount(1);
    await expect(ownItems.first()).toContainText(orderA.id.slice(-8));
    await expect(page.getByTestId("account-orders")).not.toContainText(orderB.id.slice(-8));

    await otherPage.goto("/account");
    await expect(otherPage.getByTestId("account-order-item")).toHaveCount(1);
    await expect(otherPage.getByTestId("account-order-item").first()).toContainText(
      orderB.id.slice(-8),
    );

    await otherContext.close();
  });

  test("открытый заказ показывает состав, цены снимка и итог", async ({ page, request }) => {
    const productRes = await request.get("/api/products?available=true&perPage=1");
    const product = (
      (await productRes.json()) as {
        items: { id: string; title: string; price: string }[];
      }
    ).items[0]!;

    const email = uniqueEmail("details");
    await registerViaUi(page, email, "password1");
    const order = await placeOrder(page, product.id, 2);

    await page.goto("/account");
    const item = page.getByTestId("account-order-item").first();
    await item.locator("summary").click();

    await expect(item.getByTestId("order-status")).toHaveAttribute("data-status", "paid");
    await expect(item.getByTestId("order-item")).toHaveCount(1);
    await expect(item.getByTestId("order-item")).toContainText(product.title);
    await expect(item.getByTestId("order-item")).toContainText("× 2");
    await expect(item.getByTestId("order-total")).toBeVisible();

    const expected = Number(product.price) * 2;
    expect(Number(order.total)).toBe(expected);
  });

  test("пустое состояние, если заказов нет", async ({ page }) => {
    const email = uniqueEmail("no-orders");
    await registerViaUi(page, email, "password1");
    await page.goto("/account");
    await expect(page.getByTestId("account-orders-empty")).toBeVisible();
    await expect(page.getByTestId("account-orders")).toHaveCount(0);
  });

  test("deep link /account/orders/:id открывает заказ в кабинете", async ({ page, request }) => {
    const productRes = await request.get("/api/products?available=true&perPage=1");
    const product = ((await productRes.json()) as { items: { id: string }[] }).items[0]!;

    const email = uniqueEmail("deeplink");
    await registerViaUi(page, email, "password1");
    const order = await placeOrder(page, product.id);

    await page.goto(`/account/orders/${order.id}`);
    await expect(page).toHaveURL(new RegExp(`/account\\?order=${order.id}`));
    const item = page.getByTestId("account-order-item").filter({ hasText: order.id.slice(-8) });
    await expect(item).toHaveAttribute("open", "");
    await expect(item.getByTestId("order-status")).toHaveAttribute("data-status", "paid");
  });
});
