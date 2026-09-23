import { test, expect, type Page } from "@playwright/test";

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

  test("товар добавляется в корзину и появляется в ней", async ({ page }) => {
    await page.goto("/catalog");
    await availableCatalogItem(page).first().getByTestId("catalog-item-name").click();
    const productName = await page.getByTestId("product-name").innerText();

    await page.getByTestId("product-add-to-cart").click();
    await page.getByTestId("nav-cart").click();

    await expect(page.getByTestId("cart-item")).toHaveCount(1);
    await expect(page.getByTestId("cart-item-title")).toHaveText(productName);
    await expect(page.getByTestId("cart-total")).toBeVisible();
    await expect(page.getByTestId("cart-count")).toBeVisible();
  });

  test("количество позиции меняется, итоговая сумма пересчитывается", async ({ page }) => {
    await page.goto("/catalog");
    await availableCatalogItem(page).first().getByTestId("catalog-item-name").click();
    await page.getByTestId("product-add-to-cart").click();
    await page.getByTestId("nav-cart").click();

    const qty = page.getByTestId("cart-item-qty");
    await expect(qty).toHaveValue("1");
    const totalBefore = await page.getByTestId("cart-total").innerText();

    await qty.fill("2");
    await expect(qty).toHaveValue("2");
    await expect(page.getByTestId("cart-total")).not.toHaveText(totalBefore);
  });

  test("позиция удаляется из корзины", async ({ page }) => {
    await page.goto("/catalog");
    await availableCatalogItem(page).first().getByTestId("catalog-item-name").click();
    await page.getByTestId("product-add-to-cart").click();
    await page.getByTestId("nav-cart").click();

    await page.getByTestId("cart-item-remove").click();
    await expect(page.getByTestId("cart-empty")).toBeVisible();
    await expect(page.getByTestId("cart-checkout")).toHaveCount(0);
  });

  test("состав корзины сохраняется после перезагрузки страницы", async ({ page }) => {
    await page.goto("/catalog");
    await availableCatalogItem(page).first().getByTestId("catalog-item-name").click();
    const productName = await page.getByTestId("product-name").innerText();
    await page.getByTestId("product-add-to-cart").click();
    await page.getByTestId("nav-cart").click();
    await expect(page.getByTestId("cart-item")).toHaveCount(1);

    await page.reload();
    await expect(page.getByTestId("cart-item")).toHaveCount(1);
    await expect(page.getByTestId("cart-item-title")).toHaveText(productName);
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
