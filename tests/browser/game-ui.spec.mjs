import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const supabaseStub = `
    window.supabase = {
      createClient() {
        return {
          auth: {
            getSession: async () => ({ data: { session: null }, error: null })
          }
        };
      }
    };
  `;
  await page.route(/https:\/\/(cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js|unpkg\.com\/@supabase\/supabase-js)/, route =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: supabaseStub })
  );
});

test("solo Team Word opens its Russian keyboard and accepts key taps", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#soloStart")).toBeVisible();
  await page.locator("#soloStart").click();

  await expect(page.locator(".keyboard")).toBeVisible();
  const firstRow = page.locator(".word-slots").first();
  const slots = await firstRow.locator(".word-slot").count();
  expect(slots).toBeGreaterThanOrEqual(4);

  const key = page.locator(".keyboard [data-key]").first();
  const letter = await key.getAttribute("data-key");
  await key.click();

  await expect(page.locator(".word-slot").nth(slots)).toHaveText(letter);
  await expect(page.locator(".guess-history")).toBeVisible();
});

test("guest mode is available without a Supabase session", async ({ page }) => {
  await page.goto("/");
  await page.locator("#guestSolo").click();
  await expect(page.locator(".keyboard")).toBeVisible();
  await expect(page.locator(".screen")).toContainText("ОДИНОЧНАЯ ИГРА");
});

test("Team Word fits a Pixel-sized viewport without horizontal scrolling", async ({ browser }) => {
  const { devices } = await import("@playwright/test");
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  const supabaseStub = `
    window.supabase = {
      createClient() {
        return { auth: { getSession: async () => ({ data: { session: null }, error: null }) } };
      }
    };
  `;
  await page.route(/https:\/\/(cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js|unpkg\.com\/@supabase\/supabase-js)/, route =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: supabaseStub })
  );
  await page.goto("/");
  await page.locator("#soloStart").click();
  await expect(page.locator(".keyboard")).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await context.close();
});
