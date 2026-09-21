import { test, expect, type Page } from "@playwright/test";

/** Seeded catalog fixtures the assertions below rely on. */
const SEEDED = {
  category: { slug: "graphics-cards", label: "Видеокарты" },
  searchTerm: "ryzen",
  /** Only the discontinued RTX 4090 costs this much. */
  premiumMinPrice: "200000",
  premiumTitle: /4090/i,
  unavailableSearch: "4090",
  withoutImageSearch: "термопаста",
  noMatchSearch: "такогонетвкаталоге",
};

const items = (page: Page) => page.getByTestId("catalog-item");

/** Cyrillic values land in the address percent-encoded. */
function urlHasParam(name: string, value: string): RegExp {
  return new RegExp(`${name}=${encodeURIComponent(value)}`);
}

async function itemNames(page: Page): Promise<string[]> {
  return page.getByTestId("catalog-item-name").allInnerTexts();
}

async function total(page: Page): Promise<number> {
  return Number(await page.getByTestId("catalog-total").innerText());
}

async function openCatalog(page: Page, query = "") {
  await page.goto(`/catalog${query}`);
  await expect(page.getByTestId("catalog-filters")).toBeVisible();
}

test.describe("каталог", () => {
  test("ссылка на каталог видна с любой страницы", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("nav-catalog")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByTestId("nav-catalog")).toBeVisible();

    await page.getByTestId("nav-catalog").click();
    await expect(page).toHaveURL(/\/catalog$/);
  });

  test("каталог загружается, карточки товаров видны", async ({ page }) => {
    await openCatalog(page);

    await expect(page.getByTestId("catalog-list")).toBeVisible();
    expect(await items(page).count()).toBeGreaterThan(0);
    await expect(page.getByTestId("catalog-empty")).toHaveCount(0);
  });

  test("в карточке есть название, цена и доступность", async ({ page }) => {
    await openCatalog(page);
    const card = items(page).first();

    await expect(card.getByTestId("catalog-item-name")).toBeVisible();
    await expect(card.getByTestId("catalog-item-price")).toBeVisible();
    await expect(card.getByTestId("catalog-item-price")).toContainText("₽");
    await expect(card.getByTestId("catalog-item-description")).toBeVisible();

    const availability = card.getByTestId("catalog-item-availability");
    await expect(availability).toBeVisible();
    expect(await availability.getAttribute("data-available")).toMatch(/^(true|false)$/);
  });

  test("название товара ведёт на страницу товара", async ({ page }) => {
    await openCatalog(page);
    const name = items(page).first().getByTestId("catalog-item-name");
    const title = await name.innerText();

    await name.click();

    await expect(page).toHaveURL(/\/products\//);
    await expect(page.getByTestId("product-name")).toHaveText(title);
  });

  test("фильтр по категории сужает список", async ({ page }) => {
    await openCatalog(page);
    const before = await total(page);

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);
    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));

    const after = total(page);
    expect(await after).toBeGreaterThan(0);
    expect(await after).toBeLessThan(before);
  });

  test("поиск по части названия оставляет в выдаче подходящий товар", async ({ page }) => {
    await openCatalog(page);

    await page.getByTestId("filter-search").fill(SEEDED.searchTerm);
    await expect(page).toHaveURL(new RegExp(`search=${SEEDED.searchTerm}`));

    expect(await items(page).count()).toBeGreaterThan(0);
    for (const name of await itemNames(page)) {
      expect(name.toLowerCase()).toContain(SEEDED.searchTerm);
    }
  });

  test("фильтр по цене меняет состав выдачи", async ({ page }) => {
    await openCatalog(page);
    const before = await itemNames(page);

    await page.getByTestId("filter-price-min").fill(SEEDED.premiumMinPrice);
    await expect(page).toHaveURL(new RegExp(`minPrice=${SEEDED.premiumMinPrice}`));

    const after = await itemNames(page);
    expect(after.length).toBeGreaterThan(0);
    expect(after).not.toEqual(before);
    for (const name of after) {
      expect(name).toMatch(SEEDED.premiumTitle);
    }
  });

  test("фильтр «только в наличии» убирает недоступные товары", async ({ page }) => {
    await openCatalog(page, `?search=${SEEDED.unavailableSearch}`);
    await expect(page.getByTestId("catalog-item-availability").first()).toHaveAttribute(
      "data-available",
      "false",
    );

    await page.getByTestId("filter-available").check();
    await expect(page).toHaveURL(/available=true/);

    await expect(page.getByTestId("catalog-empty")).toBeVisible();
  });

  test("недоступный товар остаётся в списке и помечен", async ({ page }) => {
    await openCatalog(page, `?search=${SEEDED.unavailableSearch}`);

    const card = items(page).first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("catalog-item-availability")).toHaveAttribute(
      "data-available",
      "false",
    );
    await expect(card.getByTestId("catalog-item-availability")).toContainText("Нет в наличии");
  });

  test("товар без изображения показывается с заглушкой", async ({ page }) => {
    await openCatalog(page, `?search=${SEEDED.withoutImageSearch}`);

    const image = items(page).first().getByTestId("catalog-item-image");
    await expect(image).toHaveAttribute("data-placeholder", "true");
    await expect(image).toHaveAttribute("src", "/product-placeholder.svg");
  });

  test("комбинация фильтров без совпадений показывает пустое состояние", async ({ page }) => {
    await openCatalog(page);

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);
    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await page.getByTestId("filter-search").fill(SEEDED.noMatchSearch);
    await expect(page).toHaveURL(urlHasParam("search", SEEDED.noMatchSearch));

    await expect(page.getByTestId("catalog-empty")).toBeVisible();
    await expect(page.getByTestId("catalog-list")).toHaveCount(0);
    await expect(page.getByTestId("catalog-total")).toHaveText("0");
  });

  test("сброс фильтров возвращает полный список", async ({ page }) => {
    await openCatalog(page);
    const fullTotal = await total(page);

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);
    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    expect(await total(page)).toBeLessThan(fullTotal);

    await page.getByTestId("filter-reset").click();

    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByTestId("catalog-total")).toHaveText(String(fullTotal));
    await expect(page.getByTestId("filter-category")).toHaveValue("");
  });
});

test.describe("каталог — пагинация", () => {
  test("переход на следующую страницу меняет набор карточек", async ({ page }) => {
    await openCatalog(page);
    const firstPage = await itemNames(page);

    await page.getByTestId("catalog-page-next").click();

    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByTestId("catalog-page-current")).toContainText("2 /");
    const secondPage = await itemNames(page);
    expect(secondPage.length).toBeGreaterThan(0);
    expect(secondPage).not.toEqual(firstPage);
    expect(secondPage.filter((name) => firstPage.includes(name))).toHaveLength(0);
  });

  test("на первой странице «назад» не уводит в несуществующую страницу", async ({ page }) => {
    await openCatalog(page);

    const prev = page.getByTestId("catalog-page-prev");
    await expect(prev).toBeVisible();
    await expect(prev).toBeDisabled();

    await prev.click({ force: true });

    await expect(page).toHaveURL(/\/catalog$/);
    await expect(page.getByTestId("catalog-page-current")).toContainText("1 /");
  });

  test("на последней странице «вперёд» не уводит дальше", async ({ page }) => {
    await openCatalog(page);
    const lastPage = (await page.getByTestId("catalog-page-current").innerText()).split("/")[1];

    await openCatalog(page, `?page=${lastPage.trim()}`);

    await expect(page.getByTestId("catalog-page-next")).toBeDisabled();
  });

  test("смена фильтра возвращает на первую страницу выдачи", async ({ page }) => {
    await openCatalog(page, "?page=3");
    await expect(page.getByTestId("catalog-page-current")).toContainText("3 /");

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);

    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.getByTestId("catalog-page-current")).toContainText("1 /");
  });

  test("пагинация сохраняет выбранные фильтры", async ({ page }) => {
    await openCatalog(page, `?category=${SEEDED.category.slug}`);

    await page.getByTestId("catalog-page-next").click();

    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByTestId("filter-category")).toHaveValue(SEEDED.category.slug);
  });
});

test.describe("каталог — состояние в адресе", () => {
  test("перезагрузка страницы с выбранным фильтром сохраняет выдачу и значения контролов", async ({
    page,
  }) => {
    await openCatalog(page);

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);
    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await page.getByTestId("filter-available").check();
    await expect(page).toHaveURL(/available=true/);

    const expectedTotal = await total(page);
    const expectedNames = await itemNames(page);

    await page.reload();

    await expect(page.getByTestId("filter-category")).toHaveValue(SEEDED.category.slug);
    await expect(page.getByTestId("filter-available")).toBeChecked();
    await expect(page.getByTestId("catalog-total")).toHaveText(String(expectedTotal));
    expect(await itemNames(page)).toEqual(expectedNames);
  });

  test("«назад» после смены фильтра возвращает предыдущую выдачу", async ({ page }) => {
    await openCatalog(page, `?category=${SEEDED.category.slug}`);
    const firstNames = await itemNames(page);
    const firstTotal = await total(page);

    await page.getByTestId("filter-category").selectOption("processors");
    await expect(page).toHaveURL(/category=processors/);
    expect(await itemNames(page)).not.toEqual(firstNames);

    await page.goBack();

    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await expect(page.getByTestId("filter-category")).toHaveValue(SEEDED.category.slug);
    await expect(page.getByTestId("catalog-total")).toHaveText(String(firstTotal));
    expect(await itemNames(page)).toEqual(firstNames);
  });

  test("«вперёд» после «назад» возвращает отфильтрованную выдачу", async ({ page }) => {
    await openCatalog(page);

    await page.getByTestId("filter-category").selectOption(SEEDED.category.slug);
    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    const filteredTotal = await total(page);

    await page.goBack();
    await expect(page).toHaveURL(/\/catalog$/);

    await page.goForward();

    await expect(page).toHaveURL(new RegExp(`category=${SEEDED.category.slug}`));
    await expect(page.getByTestId("catalog-total")).toHaveText(String(filteredTotal));
  });

  test("ссылкой на отфильтрованную выдачу можно поделиться", async ({ page }) => {
    await openCatalog(page);
    await page.getByTestId("filter-search").fill(SEEDED.searchTerm);
    await expect(page).toHaveURL(new RegExp(`search=${SEEDED.searchTerm}`));

    const shared = page.url();
    const expectedNames = await itemNames(page);

    await page.goto("/");
    await page.goto(shared);

    await expect(page.getByTestId("filter-search")).toHaveValue(SEEDED.searchTerm);
    expect(await itemNames(page)).toEqual(expectedNames);
  });

  test("поиск не отправляет запрос на каждую букву", async ({ page }) => {
    await openCatalog(page);

    const catalogRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/catalog") catalogRequests.push(url.search);
    });

    await page.getByTestId("filter-search").pressSequentially("ryzen", { delay: 40 });
    await expect(page).toHaveURL(/search=ryzen/);
    await page.waitForTimeout(500);

    // Five keystrokes must not turn into five round trips.
    expect(catalogRequests.length).toBeLessThan(5);
    expect(catalogRequests.at(-1)).toContain("search=ryzen");
  });
});
