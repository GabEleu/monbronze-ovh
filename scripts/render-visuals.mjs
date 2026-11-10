/**
 * Remplace les visuels provisoires par des rendus tirés des scènes du site (BRIEF.md §5 :
 * images fixes générées depuis les scènes, pour la version « bas » et les pages) :
 *   - étapes de la métamorphose (accueil, défilement épinglé) → public/images/etapes/ ;
 *   - aspects des sources (configurateur de l'accueil) → public/images/sources/ ;
 *   - cas d'usage (laboratoire, un scan par cas) → public/images/cas/.
 * Usage : un serveur de dev doit tourner, puis
 *   node scripts/render-visuals.mjs [http://localhost:3000]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const save = async (png, file, w, h) => {
  const img = sharp(png).resize(w, h, { fit: "cover" });
  await img.clone().webp({ quality: 80, effort: 6 }).toFile(file);
};

const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-gpu"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => {
    localStorage.setItem("monbronze:forcer-webgl", "1");
    sessionStorage.setItem("monbronze:intro-vue", "1");
  });
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.webgl === "ready", null, {
    timeout: 120_000,
  });
  await page.keyboard.press("Escape");
  await page.addStyleTag({ content: ".grain, nextjs-portal, .heat-cursor { display: none !important; }" });

  // 1. Étapes de la métamorphose.
  mkdirSync("public/images/etapes", { recursive: true });
  await page.waitForSelector(".metamorph[data-pinned]", { timeout: 90_000 });
  for (const [id, p] of [
    ["capturer", 0.06],
    ["modeliser", 0.3],
    ["fabriquer", 0.52],
    ["fondre", 0.72],
    ["patiner", 0.97],
  ]) {
    await page.evaluate((p) => {
      const track = document.querySelector(".metamorph-track");
      const stage = document.querySelector(".metamorph-stage");
      const header = document.querySelector("header").getBoundingClientRect().height;
      const top = track.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo(0, top + (track.offsetHeight - stage.offsetHeight) * p);
    }, p);
    await page.waitForTimeout(2500);
    const box = await page.locator(".metamorph-visual").boundingBox();
    const pad = box.height * 0.08;
    const clip = { x: box.x - box.width * 0.4, y: box.y - pad, width: box.width * 1.8, height: box.height + pad * 2 };
    await save(await page.screenshot({ clip }), `public/images/etapes/${id}.webp`, 900, 1200);
    console.log("étape", id);
  }

  // 2. Aspects des sources (survol des cartes du configurateur).
  mkdirSync("public/images/sources", { recursive: true });
  await page.waitForSelector(".possibilities[data-live]", { timeout: 90_000 });
  const visual = page.locator(".possibilities-visual");
  await visual.scrollIntoViewIfNeeded();
  const cards = page.locator(".possibilities li");
  for (const [i, id] of [
    [0, "sculpture"],
    [1, "objet"],
    [2, "fichier"],
    [3, "photos"],
    [4, "impression"],
    [-1, "bronze"],
  ]) {
    if (i >= 0) await cards.nth(i).hover();
    else await page.mouse.move(5, 5);
    await page.waitForTimeout(2200);
    await visual.scrollIntoViewIfNeeded();
    await save(await visual.screenshot(), `public/images/sources/${id}.webp`, 1000, 1000);
    console.log("source", id);
  }
  await page.close();

  // 3. Cas d'usage : un scan par cas, dans le laboratoire.
  mkdirSync("public/images/cas", { recursive: true });
  const lab = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await lab.goto(`${base}/lab`, { waitUntil: "load" });
  await lab.waitForFunction(() => (window.__monbronzeLab?.fps ?? 0) > 0, null, { timeout: 180_000 });
  await lab.addStyleTag({ content: ".grain, nextjs-portal, .heat-cursor, [data-lenis-prevent] > p { display: none !important; }" });
  for (const [id, model, patine, angle] of [
    ["sculpture", "patineuse", "Brun médaille", -25],
    ["buste", "buste-romain", "Noir", 15],
    ["animal", "tete-de-cheval", "Brun médaille", -35],
    ["echelle", "prince-hellenistique", "Vert-de-gris", -15],
    ["evenement", "relief-couple", "Brun médaille", 0],
    ["personnalite", "buste-romain", "Vert-de-gris", -30],
  ]) {
    await lab.getByLabel("Modèle").selectOption(model);
    await lab.locator("label", { hasText: patine }).first().click();
    await lab.getByLabel("Angle de vue").fill(String(angle));
    await lab.waitForTimeout(5000);
    const stage = lab.locator("[data-lenis-prevent]").first();
    const png = await stage.screenshot();
    const meta = await sharp(png).metadata();
    const s = meta.height;
    const left = Math.round((meta.width - s) / 2);
    const square = await sharp(png).extract({ left, top: 0, width: s, height: s }).toBuffer();
    await save(square, `public/images/cas/${id}.webp`, 1000, 1000);
    console.log("cas", id);
  }
} finally {
  await browser.close();
}
