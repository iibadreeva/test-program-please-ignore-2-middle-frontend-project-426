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
    // Держим /catalog (prefetch + soft-nav), пока не увидим сигнал перехода —
    // иначе Router Cache может завершить его раньше assertion.
    let releaseCatalog = () => {};
    const catalogGate = new Promise<void>((resolve) => {
      releaseCatalog = resolve;
    });

    await page.route(
      (url) => url.pathname === "/catalog" || url.pathname === "/catalog/",
      async (route) => {
        await catalogGate;
        await route.continue();
      },
    );

    await page.goto("/");
    await expect(page.getByTestId("nav-catalog")).toBeVisible();
    await page.getByTestId("nav-catalog").click();

    // pending-точка сразу; top bar — после SHOW_DELAY. Достаточно любого сигнала soft-nav.
    await expect(
      page
        .getByTestId("nav-link-pending")
        .or(page.getByTestId("navigation-progress")),
    ).toBeVisible({ timeout: 5000 });

    releaseCatalog();

    await expect(page).toHaveURL(/\/catalog$/, { timeout: 15_000 });
    await expect(page.getByTestId("catalog-page")).toBeVisible();
  });
});
