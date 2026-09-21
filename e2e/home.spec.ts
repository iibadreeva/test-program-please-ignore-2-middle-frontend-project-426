import { test, expect } from "@playwright/test";

test.describe("главная", () => {
  test("открывается на / и показывает промо-блоки", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("home-hero")).toBeVisible();
    await expect(page.getByTestId("home-promo")).toBeVisible();

    const items = page.getByTestId("home-promo-item");
    expect(await items.count()).toBeGreaterThanOrEqual(2);
  });

  test("клик по промо-блоку открывает страницу его товара", async ({ page }) => {
    await page.goto("/");

    const item = page.getByTestId("home-promo-item").first();
    await expect(item).toBeVisible();

    const href = await item.getAttribute("href");
    expect(href).toMatch(/^\/products\//);

    await item.click();

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByTestId("product-page")).toBeVisible();
    await expect(page.getByTestId("product-name")).toBeVisible();
  });

  test("из главной открывается каталог по ссылке в шапке", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-catalog")).toBeVisible();
    await page.getByTestId("nav-catalog").click();

    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByTestId("catalog-page")).toBeVisible();
  });
});
