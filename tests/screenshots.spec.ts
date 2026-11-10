import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

/**
 * Captures pleine page de toutes les routes → screenshots/<projet>/<route>.png
 * + tranches de la hauteur de deux écrans (…-01.png, …-02.png) pour la relecture.
 */
test.describe.configure({ mode: "parallel" });

for (const route of ROUTES) {
  test(`capture ${route.name}`, async ({ page }, info) => {
    // /lab : rendu WebGL logiciel (sans GPU) en mode headless, très lent.
    if (route.path === "/lab") test.setTimeout(180_000);
    const dir = `screenshots/${info.project.name}`;
    mkdirSync(dir, { recursive: true });

    await page.goto(route.path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Désactive le défilement fluide et le grain pour des captures nettes et stables.
    await page.addStyleTag({ content: ".grain{display:none!important}" });

    await page.screenshot({ path: `${dir}/${route.name}.png`, fullPage: true });

    const viewport = page.viewportSize()!;
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const slice = viewport.height * 2;
    for (let y = 0, i = 1; y < height; y += slice, i++) {
      await page.screenshot({
        path: `${dir}/${route.name}-${String(i).padStart(2, "0")}.png`,
        fullPage: true,
        clip: { x: 0, y, width: viewport.width, height: Math.min(slice, height - y) },
      });
    }
  });
}

test("rendus du buste dans les quatre patines (/lab)", async ({ page }, info) => {
  test.setTimeout(180_000); // rendu logiciel en mode headless
  const dir = `screenshots/${info.project.name}`;
  mkdirSync(dir, { recursive: true });
  await page.goto("/lab");
  const canvas = page.locator("canvas");
  await expect(page.getByTestId("fps")).toHaveText(/^\d+$/, { timeout: 60_000 });
  // Rotation figée pour des rendus comparables.
  await page.getByRole("checkbox", { name: "Rotation automatique" }).uncheck();
  for (const [name, file] of [
    ["Brun médaille", "brun-medaille"],
    ["Vert-de-gris", "vert-de-gris"],
    ["Noir", "noir"],
    ["Doré", "dore"],
  ]) {
    await page.locator("label", { has: page.getByRole("radio", { name }) }).click();
    await page.waitForTimeout(1500);
    await canvas.screenshot({ path: `${dir}/lab-buste-${file}.png` });
  }
});

test("accueil « La coulée » : état final (WebGL forcé)", async ({ page }, info) => {
  test.setTimeout(180_000);
  const dir = `screenshots/${info.project.name}`;
  mkdirSync(dir, { recursive: true });
  await page.addInitScript(() => localStorage.setItem("monbronze:forcer-webgl", "1"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-webgl", "ready", { timeout: 90_000 });
  const skip = page.getByRole("button", { name: "Passer l'intro" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __monbronzeStage: () => { intro: string } }).__monbronzeStage()
              .intro,
        ),
      { timeout: 90_000 },
    )
    .toBe("done");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${dir}/accueil-coulee.png` });
});
