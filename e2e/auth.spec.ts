import { test, expect, type Page } from "@playwright/test";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function registerViaUi(page: Page, email: string, password: string, name?: string) {
  await page.goto("/register");
  await expect(page.getByTestId("register-page")).toBeVisible();
  if (name) {
    await page.getByTestId("auth-name").fill(name);
  }
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page.getByTestId("nav-signout")).toBeVisible({ timeout: 15_000 });
}

async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
}

async function signOut(page: Page) {
  await page.getByTestId("nav-signout").click();
  await expect(page.getByTestId("nav-signin")).toBeVisible({ timeout: 15_000 });
}

test.describe("auth", () => {
  test("новый пользователь регистрируется и оказывается авторизованным", async ({ page }) => {
    const email = uniqueEmail("reg");
    await registerViaUi(page, email, "password1", "Тест Юзер");
    await expect(page.getByTestId("nav-account")).toBeVisible();
    await expect(page.getByTestId("nav-signout")).toBeVisible();
    await expect(page.getByTestId("nav-signin")).toHaveCount(0);
    await expect(page).toHaveURL(/\/account/);
  });

  test("зарегистрированный пользователь входит по email и паролю", async ({ page }) => {
    const email = uniqueEmail("login");
    const password = "password1";
    await registerViaUi(page, email, password, "Login User");
    await signOut(page);

    await loginViaUi(page, email, password);
    await expect(page.getByTestId("nav-signout")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("nav-account")).toBeVisible();
  });

  test("авторизованный пользователь выходит, и личный раздел недоступен", async ({ page }) => {
    const email = uniqueEmail("logout");
    await registerViaUi(page, email, "password1");
    await signOut(page);

    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-page")).toBeVisible();
  });

  test("регистрация с занятым email отклоняется", async ({ page }) => {
    const email = uniqueEmail("taken");
    await registerViaUi(page, email, "password1", "First");
    await signOut(page);

    await page.goto("/register");
    await expect(page.getByTestId("register-page")).toBeVisible();
    await page.getByTestId("auth-email").fill(email);
    await page.getByTestId("auth-password").fill("password1");
    await page.getByTestId("auth-submit").click();

    await expect(page.getByTestId("auth-error")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("auth-error")).toContainText(/email|уже/i);
    await expect(page.getByTestId("nav-signin")).toBeVisible();
  });

  test("вход с неверным паролем отклоняется", async ({ page }) => {
    const email = uniqueEmail("badpass");
    await registerViaUi(page, email, "password1");
    await signOut(page);

    await loginViaUi(page, email, "wrong-password");
    await expect(page.getByTestId("auth-error")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("auth-error")).toContainText(/пароль|неверн/i);
    await expect(page.getByTestId("nav-signin")).toBeVisible();
  });

  test("после перезагрузки страницы пользователь остаётся авторизованным", async ({ page }) => {
    const email = uniqueEmail("reload");
    await registerViaUi(page, email, "password1", "Reload User");
    await page.reload();
    await expect(page.getByTestId("nav-signout")).toBeVisible();
    await expect(page.getByTestId("nav-account")).toBeVisible();
  });

  test("неавторизованный посетитель не попадает на /account по прямому адресу", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("account-page")).toHaveCount(0);
  });

  test("выход инвалидирует сессию на сервере", async ({ page, request }) => {
    const email = uniqueEmail("api-logout");
    const password = "password1";

    const registerRes = await page.request.post("/api/auth/register", {
      data: { email, password, name: "API User" },
    });
    expect(registerRes.status()).toBe(201);

    const meOk = await page.request.get("/api/auth/me");
    expect(meOk.status()).toBe(200);

    const sessionCookies = (await page.context().cookies()).filter((c) => c.name === "session");
    expect(sessionCookies.length).toBeGreaterThan(0);
    const rawSession = sessionCookies[0]!.value;

    const logoutRes = await page.request.post("/api/auth/logout");
    expect(logoutRes.status()).toBe(204);

    const stale = await request.get("/api/auth/me", {
      headers: { cookie: `session=${rawSession}` },
    });
    expect(stale.status()).toBe(401);
  });
});
