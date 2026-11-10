import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ALL_STORIES, ROUTES } from "./routes";
import { newObjectKey, OBJECT_KEY, presign } from "../lib/object-storage";

for (const route of ROUTES) {
  test.describe(`${route.path}`, () => {
    test("statut, langue, un seul H1, métadonnées, aucune erreur console", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !(route.status === 404 && /404/.test(msg.text())))
          errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(err.message));

      const response = await page.goto(route.path);
      expect(response?.status()).toBe(route.status ?? 200);
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/monbronze\.fr/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);

      if (route.status !== 404) {
        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveAttribute(
          "href",
          `https://monbronze.fr${route.path === "/" ? "" : route.path}`,
        );
      }
      if (route.path === "/lab" || route.status === 404) {
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      }
      // Aucun défilement horizontal.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      // Le bouton d'action est toujours à un clic.
      await expect(
        page.getByRole("banner").getByRole("link", { name: /parler de mon projet/i }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("accessibilité (axe, WCAG 2.2 AA)", async ({ page }) => {
      await page.goto(route.path);
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      }));
      expect(summary).toEqual([]);
    });
  });
}

test("toutes les histoires sont générées et portent le badge « Exemple illustratif »", async ({
  page,
}) => {
  for (const slug of ALL_STORIES) {
    const response = await page.goto(`/realisations/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("Exemple illustratif").first()).toBeVisible();
  }
});

test("le lien d'évitement mène au contenu principal", async ({ page }) => {
  await page.goto("/concept");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#contenu")).toBeFocused();
});

test("navigation par le menu principal", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: "Menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu du site" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: /Comment ça marche/ }).click();
    await expect(dialog).toBeHidden();
  } else {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Comment ça marche" })
      .click();
  }
  await expect(page).toHaveURL(/\/comment-ca-marche$/);
  // Next 16 conserve la page précédente masquée (retour arrière instantané) : on vise le H1 visible.
  await expect(page.locator("h1:visible")).toHaveCount(1);
  await expect(page.locator("h1:visible")).toContainText(
    "Et si votre idée devenait une sculpture en bronze",
  );
});

test("le menu mobile se ferme avec Échap et rend le focus", async ({ page, isMobile }) => {
  test.skip(!isMobile, "menu plein écran : mobile uniquement en phase 0");
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  await button.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(button).toBeFocused();
});

test("écran tactile : les sources se font glisser, un toucher les active ; ordinateur inchangé", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const list = page.locator(".possibilities-sources");
  await list.scrollIntoViewIfNeeded();
  const display = await list.evaluate((el) => getComputedStyle(el).display);
  if (!isMobile) {
    // Souris : grille d'origine, survol inchangé.
    expect(display).toBe("grid");
    return;
  }
  expect(display).toBe("flex");
  expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  const card = list.locator("li").first();
  await expect(async () => {
    await card.tap();
    await expect(card).toHaveAttribute("data-active", "", { timeout: 500 });
  }).toPass();
  await card.tap();
  await expect(card).not.toHaveAttribute("data-active");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("patines : sous la sculpture au téléphone, dans la colonne du configurateur à l'ordinateur", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const section = page.locator(".possibilities");
  // Un seul choix de patine exposé à la fois (l'autre présentation est masquée).
  await expect(section.getByRole("radio", { name: "Vert-de-gris" })).toHaveCount(1);
  const fieldset = section.locator("fieldset").filter({ visible: true });
  await expect(fieldset).toHaveCount(1);
  const visual = page.locator(".possibilities-visual");
  if (isMobile) {
    // Juste sous la sculpture : choisir la patine et voir la pièce dans le même écran.
    await fieldset.scrollIntoViewIfNeeded();
    await expect(fieldset).toBeInViewport({ ratio: 1 });
    await expect(visual).toBeInViewport({ ratio: 0.9 });
    const v = (await visual.boundingBox())!;
    const f = (await fieldset.boundingBox())!;
    expect(f.y - (v.y + v.height)).toBeLessThan(48);
  } else {
    // Ordinateur inchangé : le choix reste dans la colonne de droite.
    await visual.scrollIntoViewIfNeeded();
    const v = (await visual.boundingBox())!;
    const f = (await fieldset.boundingBox())!;
    expect(f.x).toBeGreaterThan(v.x + v.width);
  }
  await fieldset.locator("label", { hasText: "Vert-de-gris" }).click();
  await expect(section.getByRole("radio", { name: "Vert-de-gris" })).toBeChecked();
  // Même état partagé : la patine affichée près du bouton suit le choix.
  await expect(section.getByText(/Patine\s*:\s*Vert-de-gris/)).toBeAttached();
});

test("pièces jointes : signature S3 conforme à l'exemple officiel AWS, clés imprévisibles", () => {
  const url = presign(
    {
      endpoint: new URL("https://s3.amazonaws.com"),
      region: "us-east-1",
      bucket: "examplebucket",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      pathStyle: false,
    },
    { method: "GET", key: "test.txt", expires: 86400, now: new Date("2013-05-24T00:00:00Z") },
  );
  expect(url).toContain("https://examplebucket.s3.amazonaws.com/test.txt?");
  expect(url).toContain(
    "X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
  );
  const key = newObjectKey("../Photo de mamie (été).JPG");
  expect(key).toMatch(OBJECT_KEY);
  expect(key).not.toContain("..");
});

test("pièces jointes sans stockage configuré : 501 (mode simulé)", async ({ request }) => {
  const res = await request.post("/api/upload", {
    data: { name: "photo.jpg", size: 1000, type: "image/jpeg" },
  });
  expect(res.status()).toBe(501);
});

test("« Expérience allégée » est mémorisée", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("switch", { name: /Expérience allégée/ });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-experience", "lite");
  await page.reload();
  await expect(page.getByRole("switch", { name: /Expérience allégée/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("data-experience", "lite");
});

test("sitemap et robots", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://monbronze.fr/concept");
  expect(sitemap).toContain("https://monbronze.fr/realisations/fidele");
  expect(sitemap).not.toContain("/lab");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://monbronze.fr/sitemap.xml");
});

test("le laboratoire affiche la scène WebGL et mesure les images par seconde", async ({ page }) => {
  await page.goto("/lab");
  const canvas = page.locator("canvas");
  test.setTimeout(90_000); // rendu logiciel (sans GPU) en mode headless : lent
  await expect(canvas).toBeVisible({ timeout: 40_000 });
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByTestId("fps")).toHaveText(/^\d+$/, { timeout: 40_000 });
  // Les quatre patines sont sélectionnables.
  for (const name of ["Vert-de-gris", "Noir", "Doré", "Brun médaille"]) {
    await page.getByRole("radio", { name }).check({ force: true });
    await expect(page.getByRole("radio", { name })).toBeChecked();
  }
});

test.describe("accueil « La coulée »", () => {
  test("la coulée se joue, puis le titre HTML reste présent et lisible", async ({ page }) => {
    test.setTimeout(120_000);
    // Le navigateur de test n'a pas de carte graphique (rendu logiciel) : on force le WebGL.
    await page.addInitScript(() => localStorage.setItem("monbronze:forcer-webgl", "1"));
    await page.goto("/");
    // Le H1 existe en HTML dès le premier affichage.
    await expect(page.locator("h1")).toHaveText(/Et si votre idée devenait un bronze/i);
    // Le canvas persistant se monte (rendu logiciel en mode headless : lent).
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "ready", { timeout: 60_000 });
    await expect(page.locator(".webgl-root canvas")).toHaveAttribute("aria-hidden", "true");
    // Passer l'intro (creuset ou coulée en cours), sinon attendre la fin de la coulée.
    const skip = page.getByRole("button", { name: "Passer l'intro" });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      // Le bouton disparaît : le focus passe au titre, jamais sur <body>.
      await expect(skip).toHaveCount(0);
      await expect(page.locator("#hero-title")).toBeFocused();
    }
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (
                window as unknown as { __monbronzeStage: () => { intro: string } }
              ).__monbronzeStage().intro,
          ),
        { timeout: 60_000 },
      )
      .toBe("done");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("retour sur l'accueil : le canvas redevient prêt", async ({ page }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => localStorage.setItem("monbronze:forcer-webgl", "1"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "ready", { timeout: 60_000 });
    await page.keyboard.press("Escape");
    // Navigation côté client (lien de la légende de la sculpture, visible sur mobile aussi).
    await page.locator(".hero").getByRole("link", { name: "Crédits" }).click();
    await expect(page.locator("h1:visible")).toHaveText(/crédits/i);
    await page.goBack();
    await expect(page.locator("h1:visible")).toHaveText(/Et si votre idée/i);
    await page.waitForTimeout(3000);
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "ready", { timeout: 60_000 });
  });

  test("modèle 3D introuvable : version statique, le site reste utilisable", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => localStorage.setItem("monbronze:forcer-webgl", "1"));
    await page.route("**/models/*.glb", (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "off", { timeout: 60_000 });
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /Créer mon projet/i }).first()).toBeVisible();
  });

  test("couleurs forcées : version statique", async ({ browser }) => {
    const context = await browser.newContext({ forcedColors: "active" });
    await context.addInitScript(() => localStorage.setItem("monbronze:forcer-webgl", "1"));
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "off");
    await expect(page.locator(".webgl-root")).toHaveCount(0);
    await context.close();
  });

  test("mouvement réduit : aucun WebGL, version statique", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "off");
    await page.waitForTimeout(1500);
    await expect(page.locator(".webgl-root")).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
    // La sculpture apparaît en image fixe, au même emplacement.
    await expect(page.locator(".hero-bust")).toHaveCSS("opacity", "1");
    await context.close();
  });
});

test.describe("métamorphose", () => {
  /** Fait défiler jusqu'à une progression donnée (0 à 1) de la scène épinglée. */
  async function scrollTo(page: import("@playwright/test").Page, progress: number) {
    await page.evaluate((p) => {
      const track = document.querySelector(".metamorph-track") as HTMLElement;
      const stage = document.querySelector(".metamorph-stage") as HTMLElement;
      const header = document.querySelector("header")!.getBoundingClientRect().height;
      const top = track.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo(0, top + (track.offsetHeight - stage.offsetHeight) * p);
    }, progress);
  }

  test("défilement épinglé : cinq états, texte et jauge synchronisés, dans les deux sens", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await page.addInitScript(() => {
      localStorage.setItem("monbronze:forcer-webgl", "1");
      sessionStorage.setItem("monbronze:intro-vue", "1");
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "ready", { timeout: 60_000 });
    // La scène se charge après la coulée de l'accueil (Échap la passe).
    await page.keyboard.press("Escape");
    await expect(page.locator(".metamorph[data-pinned]")).toBeAttached({ timeout: 60_000 });
    const current = page.locator('.metamorph-step[aria-current="step"] h3');
    const gauge = page.locator(".metamorph-gauge-value > span:last-child");
    for (const [p, title] of [
      [0.05, /capturer/i],
      [0.3, /modéliser/i],
      [0.5, /fabriquer/i],
      [0.7, /mouler et fondre/i],
      [0.97, /ciseler et.patiner/i],
      [0.3, /modéliser/i],
    ] as const) {
      await scrollTo(page, p);
      await expect(current).toHaveText(title);
    }
    await scrollTo(page, 0.72);
    await expect(gauge).toHaveText(/1\s?200/);
    await scrollTo(page, 0.97);
    await expect(gauge).toHaveText(/^20/);
    // Les cinq étapes restent dans le HTML (lecteurs d'écran), aucun défilement horizontal.
    await expect(page.locator(".metamorph-step")).toHaveCount(5);
    // Accessibilité en mode épinglé (texte posé sur le canvas).
    await scrollTo(page, 0.7);
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .include(".metamorph")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("sans WebGL : planche statique des cinq états", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-webgl", "off");
    await expect(page.locator(".metamorph[data-pinned]")).toHaveCount(0);
    await expect(page.locator(".metamorph-step")).toHaveCount(5);
    await expect(page.locator(".metamorph-step").nth(3)).toContainText(/1\s?200/);
    await context.close();
  });
});

test("rendu logiciel sans forçage : version statique, pas de three.js", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-webgl", "off", { timeout: 15_000 });
  await expect(page.locator(".webgl-root")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
});

test.describe("contact", () => {
  // PNG 1 × 1 transparent.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );

  test("parcours complet en 4 étapes, en mode simulé", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/contact?patine=vert-de-gris");
    const next = page.getByRole("button", { name: /Continuer/ });

    // Étape 1 : la patine du configurateur est reprise ; sans choix, l'erreur est annoncée.
    await expect(page.getByText(/Patine choisie/)).toContainText(/vert-de-gris/i);
    await next.click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/point de départ/);
    await page.getByText("Une sculpture", { exact: true }).click();
    await next.click();

    // Étape 2 : le focus passe sur le titre de l'étape.
    await expect(page.getByRole("heading", { name: "Racontez-nous votre idée" })).toBeFocused();
    await next.click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/10 caractères/);
    await page
      .getByLabel("Votre demande", { exact: true })
      .fill("Un buste en bronze de mon grand-père, d'environ 40 cm, pour la maison familiale.");
    await page.getByText("La mémoire", { exact: true }).click();
    await next.click();

    // Étape 3 : un fichier accepté (aperçu), un format refusé.
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({ name: "croquis.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator(".contact-file")).toHaveCount(1);
    await expect(page.locator(".contact-file")).toContainText("croquis.png");
    await input.setInputFiles({
      name: "outil.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("x"),
    });
    await expect(page.locator("form").getByRole("alert")).toContainText(/Format non accepté/);
    await next.click();

    // Étape 4 : coordonnées, e-mail invalide puis corrigé, consentement.
    await page.getByLabel("Prénom", { exact: true }).fill("Camille");
    await page.getByLabel("Nom", { exact: true }).fill("Martin");
    await page.getByLabel("Adresse e-mail").fill("camille@");
    await page.getByLabel(/J.accepte/).check();
    await page.getByRole("button", { name: /Envoyer ma demande/ }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/adresse e-mail valide/);
    await page.getByLabel("Adresse e-mail").fill("camille@example.com");
    await page.getByRole("button", { name: /Envoyer ma demande/ }).click();

    // Confirmation : sceau, message, mode simulé signalé honnêtement.
    await expect(
      page.getByRole("heading", { name: /votre demande est bien arrivée/ }),
    ).toBeFocused();
    await expect(page.getByText(/Mode simulé/)).toBeVisible();
  });

  test("le serveur refuse une demande invalide", async ({ request }) => {
    const res = await request.post("/api/contact", { data: { source: "sculpture" } });
    expect(res.status()).toBe(400);
  });
});

test("images de partage (Open Graph) générées", async ({ request }) => {
  for (const path of ["/opengraph-image", "/realisations/fidele/opengraph-image"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});
