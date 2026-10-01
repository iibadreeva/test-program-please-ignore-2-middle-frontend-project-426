import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Карточка с товаром в наличии (data-available на availability, не на article). */
function availableCatalogItem(page: Page) {
  return page.getByTestId("catalog-item").filter({
    has: page.locator('[data-testid="catalog-item-availability"][data-available="true"]'),
  });
}

function unavailableCatalogItem(page: Page) {
  return page.getByTestId("catalog-item").filter({
    has: page.locator('[data-testid="catalog-item-availability"][data-available="false"]'),
  });
}

type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  stock: number;
};

/**
 * Товар с запасом остатка: UI clamp'ит qty по stock, а параллельные e2e
 * могут схлопнуть первый дешёвый sku. Берём дорогой конец выдачи (price_desc),
 * checkout/account обычно берут price_asc.
 */
async function fetchProductWithStock(
  request: APIRequestContext,
  minStock: number,
): Promise<ProductSummary> {
  const response = await request.get("/api/products?available=true&perPage=48&sort=price_desc");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { items: ProductSummary[] };
  expect(body.items.length).toBeGreaterThan(0);
  const match = body.items.find((item) => item.stock >= minStock);
  expect(match, `нет товара со stock >= ${minStock}`).toBeTruthy();
  return match!;
}

const CART_STORAGE_KEY = "hexparts.cart.v1";

/** Дождаться persist в localStorage после add — иначе переход на /cart гоняет пустой store. */
async function expectCartPersisted(page: Page, productId: string) {
  await expect
    .poll(async () => {
      return page.evaluate(
        ({ key, id }) => {
          const raw = localStorage.getItem(key);
          if (!raw) return false;
          try {
            const parsed = JSON.parse(raw) as { state?: { refs?: { productId: string }[] } };
            return Boolean(parsed.state?.refs?.some((ref) => ref.productId === id));
          } catch {
            return false;
          }
        },
        { key: CART_STORAGE_KEY, id: productId },
      );
    })
    .toBe(true);
}

async function addAvailableProductToCart(page: Page, product: ProductSummary) {
  await page.goto(`/products/${product.slug}`);
  await expect(page.getByTestId("product-name")).toHaveText(product.title);
  await page.getByTestId("product-add-to-cart").click();
  await expect(page.getByTestId("add-to-cart-success")).toBeVisible();
  await expectCartPersisted(page, product.id);
}

test.describe("корзина", () => {
  test.beforeEach(async ({ page }) => {
    // Очищаем один раз через evaluate — не через addInitScript:
    // иначе clear сработает на каждом goto/reload и сотрёт только что добавленную корзину.
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("карточка товара открывается и показывает название, цену и описание", async ({ page }) => {
    await page.goto("/catalog");
    const name = availableCatalogItem(page).first().getByTestId("catalog-item-name");
    const title = await name.innerText();
    await name.click();

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByTestId("product-name")).toHaveText(title);
    await expect(page.getByTestId("product-price")).toBeVisible();
    await expect(page.getByTestId("product-description")).toBeVisible();
  });

  test("товар добавляется в корзину и появляется в ней", async ({ page, request }) => {
    const product = await fetchProductWithStock(request, 5);
    await addAvailableProductToCart(page, product);
    await page.getByTestId("nav-cart").click();

    await expect(page.getByTestId("cart-item")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByTestId("cart-item-title")).toHaveText(product.title);
    await expect(page.getByTestId("cart-total")).toBeVisible();
    await expect(page.getByTestId("cart-count")).toBeVisible();
  });

  test("количество позиции меняется, итоговая сумма пересчитывается", async ({
    page,
    request,
  }) => {
    // Нужен stock >= 2: input max=stock, setQuantity clamp'ит значение.
    const product = await fetchProductWithStock(request, 5);
    await addAvailableProductToCart(page, product);
    await page.getByTestId("nav-cart").click();

    const qty = page.getByTestId("cart-item-qty");
    await expect(qty).toHaveValue("1", { timeout: 15_000 });
    const max = Number(await qty.getAttribute("max"));
    expect(max).toBeGreaterThanOrEqual(2);
    const totalBefore = await page.getByTestId("cart-total").innerText();

    await qty.fill("2");
    await expect(qty).toHaveValue("2");
    await expect(page.getByTestId("cart-total")).not.toHaveText(totalBefore);
  });

  test("позиция удаляется из корзины", async ({ page, request }) => {
    const product = await fetchProductWithStock(request, 5);
    await addAvailableProductToCart(page, product);
    await page.getByTestId("nav-cart").click();

    await page.getByTestId("cart-item-remove").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(page.getByTestId("cart-checkout")).toHaveCount(0);
  });

  test("состав корзины сохраняется после перезагрузки страницы", async ({ page, request }) => {
    const product = await fetchProductWithStock(request, 5);
    await addAvailableProductToCart(page, product);
    await page.getByTestId("nav-cart").click();
    await expect(page.getByTestId("cart-item")).toHaveCount(1, { timeout: 15_000 });

    await page.reload();
    await expect(page.getByTestId("cart-item")).toHaveCount(1, { timeout: 15_000 });
    await expect(page.getByTestId("cart-item-title")).toHaveText(product.title);
  });

  test("недоступный товар в корзину не добавляется", async ({ page }) => {
    await page.goto("/catalog?search=4090");
    await expect(page.getByTestId("catalog-filters")).toBeVisible();
    const unavailable = unavailableCatalogItem(page).first();
    await expect(unavailable).toBeVisible();
    await unavailable.getByTestId("catalog-item-name").click();

    const button = page.getByTestId("product-add-to-cart");
    await expect(button).toBeDisabled();
    await page.getByTestId("nav-cart").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
  });

  test("пустая корзина показывает своё состояние и не пускает к оформлению", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(page.getByTestId("cart-checkout")).toHaveCount(0);
  });
});
