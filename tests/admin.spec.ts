import { expect, test } from "@playwright/test";

// Lancé APRÈS tests/site.spec.ts (npm test) : chaque enregistrement régénère tout le site,
// ce qui ralentirait les autres parcours lancés en parallèle.
/**
 * Espace d'administration (/admin). Valeurs DE TEST fournies au serveur par
 * playwright.config.ts (mot de passe, dossier de contenu temporaire). Ordinateur seulement,
 * en série : une seule connexion (la limite d'essais par adresse reste réaliste).
 */
test.describe("espace d'administration", () => {
  test.describe.configure({ mode: "serial" });
  const PASSWORD = "mot-de-passe-de-test-admin";
  let page: import("@playwright/test").Page;

  test.beforeAll(async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop", "ordinateur seulement");
    page = await browser.newPage({ baseURL: info.project.use.baseURL, locale: "fr-FR" });
  });
  test.afterAll(async () => page?.close());

  test("API : refus sans session, sans origine, et page non indexée", async ({ request }) => {
    expect((await request.get("/api/admin/content")).status()).toBe(401);
    const noOrigin = await request.put("/api/admin/content", { data: { kind: "pages", data: {} } });
    expect(noOrigin.status()).toBe(403);
    const forged = await request.put("/api/admin/content", {
      data: { kind: "pages", data: {} },
      headers: { Origin: "https://exemple.invalid" },
    });
    expect(forged.status()).toBe(403);
    const html = await (await request.get("/admin")).text();
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    expect((await request.get("/media/../package.json")).status()).toBe(404);
  });

  test("connexion : mauvais mot de passe refusé, bon accepté", async () => {
    await page.goto("/admin");
    await page.getByLabel("Mot de passe").fill("pas-le-bon-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(/Mot de passe incorrect/);
    await page.getByLabel("Mot de passe").fill(PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("tab", { name: "Réalisations" })).toBeVisible();
    const cookie = (await page.context().cookies()).find((c) => c.name === "mb_admin");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Strict");
  });

  test("coordonnées : le téléphone saisi apparaît dans le pied de page, sans rebuild", async () => {
    await page.getByRole("tab", { name: /Coordonnées/ }).click();
    await page.getByLabel("Téléphone").fill("01 23 45 67 89");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Enregistré/ })).toBeVisible();
    await page.goto("/mentions-legales");
    await expect(page.locator("footer")).toContainText("01 23 45 67 89");
    await page.goto("/admin");
    await expect(page.getByRole("tab", { name: "Réalisations" })).toBeVisible();
  });

  test("nouvelle réalisation : photo, modèle 3D préparé dans le navigateur, page publiée", async () => {
    test.setTimeout(120_000);
    const sharp = (await import("sharp")).default;
    const png = await sharp({
      create: { width: 120, height: 160, channels: 3, background: "#8a5a32" },
    })
      .png()
      .toBuffer();
    // Petit modèle STL (pyramide à base carrée), écrit à la main : aucune ressource tierce.
    const v = [
      [-0.5, 0, -0.5],
      [0.5, 0, -0.5],
      [0.5, 0, 0.5],
      [-0.5, 0, 0.5],
      [0, 1, 0],
    ];
    const faces = [
      [0, 2, 1],
      [0, 3, 2],
      [0, 1, 4],
      [1, 2, 4],
      [2, 3, 4],
      [3, 0, 4],
    ];
    const stl = `solid essai\n${faces
      .map(
        (f) =>
          `facet normal 0 0 0\nouter loop\n${f.map((i) => `vertex ${v[i]!.join(" ")}`).join("\n")}\nendloop\nendfacet`,
      )
      .join("\n")}\nendsolid essai\n`;

    // Onglets masqués toujours montés : on vise le panneau visible.
    const panel = page.getByRole("tabpanel");
    await panel.getByRole("button", { name: "Nouvelle réalisation" }).click();
    // Le formulaire s'ouvre sur son titre (focus), sans nature cochée par défaut.
    await expect(page.getByRole("heading", { name: "Nouvelle réalisation" })).toBeFocused();
    await panel.getByLabel(/^Titre/).fill("Essai d'administration");
    // Sans nature ni photo : enregistrement refusé, avec des messages clairs.
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Choisissez la nature/ }),
    ).toBeVisible();
    await panel.getByLabel("Réalisation réelle de la fonderie").check();
    await panel
      .getByLabel(/^Résumé/)
      .fill("Une pièce enregistrée par le test de l'espace d'administration.");
    await panel
      .getByLabel(/^Le besoin/)
      .fill("Vérifier qu'une réalisation se publie sans reconstruire le site.");
    await panel
      .getByLabel(/^La solution/)
      .fill("Un enregistrement, puis la page est régénérée à la visite.");
    await panel
      .getByRole("group", { name: /Photo principale/ })
      .locator('input[type="file"]')
      .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
    await panel.getByLabel(/Description de l.image/).fill("Plaque de bronze d'essai");
    await panel
      .locator('input[type="file"][accept*=".stl"]')
      .setInputFiles({ name: "pyramide.stl", mimeType: "model/stl", buffer: Buffer.from(stl) });
    await page.getByRole("button", { name: "Utiliser ce modèle" }).click({ timeout: 90_000 });
    await expect(panel.getByLabel(/Légende sous la sculpture/)).toBeVisible({ timeout: 30_000 });
    await panel.getByLabel(/Légende sous la sculpture/).fill("Pyramide d'essai");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: /Enregistré/ })).toBeVisible();

    // Honnêteté et sûreté, vérifiées par le serveur (cookie de session de la page).
    const origin = { Origin: new URL(page.url()).origin };
    const listing = (await (await page.request.get("/api/admin/content")).json()) as {
      realisations: Record<string, unknown>[];
    };
    const fidele = listing.realisations.find((r) => r.slug === "fidele")!;
    // Un rendu d'œuvre de musée ne peut pas devenir une « réalisation réelle ».
    const museum = await page.request.put("/api/admin/content", {
      data: { kind: "realisation", data: { ...fidele, type: "reel" }, previousSlug: "fidele" },
      headers: origin,
    });
    expect(museum.status()).toBe(400);
    expect((await museum.json()).error).toMatch(/œuvre de musée/);
    // Une nouvelle réalisation ne peut pas écraser une page existante (même adresse).
    const clash = await page.request.put("/api/admin/content", {
      data: { kind: "realisation", data: { ...fidele, titre: "Doublon" } },
      headers: origin,
    });
    expect(clash.status()).toBe(409);
    // Messages en français, avec le nom des champs.
    const invalid = await page.request.put("/api/admin/content", {
      data: { kind: "realisation", data: { ...fidele, etapes: [] }, previousSlug: "fidele" },
      headers: origin,
    });
    expect((await invalid.json()).details.join(" ")).toMatch(/Étapes du procédé/);

    await page.goto("/realisations/essai-d-administration");
    await expect(page.locator("h1:visible")).toContainText(/Essai d.administration/);
    await expect(page.getByText("Pyramide d’essai").first()).toBeVisible();
    await page.goto("/realisations");
    await expect(page.getByText(/Essai d.administration/).first()).toBeVisible();

    // Les fichiers envoyés sont servis (noms choisis par le serveur).
    const html = await page.request
      .get("/realisations/essai-d-administration")
      .then((r) => r.text());
    const glb = /\/media\/modeles\/[0-9a-f-]{36}\.glb/.exec(html)?.[0];
    const img = /\/media\/images\/[0-9a-f-]{36}\.webp/.exec(html)?.[0];
    expect(img, "photo publiée").toBeTruthy();
    expect((await page.request.get(img!)).headers()["content-type"]).toBe("image/webp");
    if (glb) expect((await page.request.get(glb)).status()).toBe(200);

    // Nettoyage : suppression par l'API (cookie de session de la page, origine du site).
    const del = await page.request.delete("/api/admin/content", {
      data: { slug: "essai-d-administration" },
      headers: { Origin: new URL(page.url()).origin },
    });
    expect(del.status()).toBe(200);
  });

  test("déconnexion : la session est révoquée côté serveur", async ({ request }) => {
    const cookie = (await page.context().cookies()).find((c) => c.name === "mb_admin")!;
    const header = { cookie: `mb_admin=${cookie.value}` };
    expect((await request.get("/api/admin/content", { headers: header })).status()).toBe(200);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    // L'ancien cookie, même rejoué, ne vaut plus rien.
    expect((await request.get("/api/admin/content", { headers: header })).status()).toBe(401);
  });
});
