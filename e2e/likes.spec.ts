import { expect, test, type Page } from "@playwright/test";

const likeButton = (page: Page, title: string) =>
  page.locator(".prj-item", { hasText: title }).locator("[data-like]");

const countOf = async (page: Page, title: string) =>
  Number(await likeButton(page, title).locator("[data-like-count]").textContent());

test.describe("Likes", () => {
  test("toggles on and off and survives a reload", async ({ page }) => {
    await page.goto("/?orden=az");
    const button = likeButton(page, "Chamo Learn");
    const before = await countOf(page, "Chamo Learn");

    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button.locator("[data-like-count]")).toHaveText(String(before + 1));

    await page.reload();
    await expect(likeButton(page, "Chamo Learn")).toHaveAttribute("aria-pressed", "true");
    expect(await countOf(page, "Chamo Learn")).toBe(before + 1);

    await likeButton(page, "Chamo Learn").click();
    await expect(likeButton(page, "Chamo Learn")).toHaveAttribute("aria-pressed", "false");
    await expect(likeButton(page, "Chamo Learn").locator("[data-like-count]")).toHaveText(String(before));
  });

  test("counts one like per visitor", async ({ browser }) => {
    const title = "Casa Llave";
    let start = 0;
    for (let visitor = 0; visitor < 3; visitor += 1) {
      const context = await browser.newContext(); // fresh cookie = new visitor
      const page = await context.newPage();
      await page.goto("/?orden=az");
      if (visitor === 0) start = await countOf(page, title);
      await likeButton(page, title).click();
      await expect(likeButton(page, title).locator("[data-like-count]")).toHaveText(String(start + visitor + 1));
      await context.close();
    }
  });

  test("'Más votados' orders cards by likes", async ({ page }) => {
    await page.goto("/?orden=az");
    await likeButton(page, "Doc en Casa").click();
    await expect(likeButton(page, "Doc en Casa")).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Ordenar").selectOption("populares");
    await expect(page).toHaveURL(/orden=populares/);
    const counts = (await page.locator("#project-directory-list [data-like-count]").allTextContents()).map(Number);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(counts[0]).toBeGreaterThan(0);
  });

  test("the like button does not open the project page", async ({ page }) => {
    await page.goto("/?orden=az");
    await likeButton(page, "Finca Viva").click();
    await expect(page).toHaveURL(/\/\?orden=az/);
  });
});
