/**
 * Images fixes des histoires (BRIEF.md §5 : « une image fixe générée depuis la scène pour
 * les aperçus, l'image de partage et le mode bas »). Chaque image est un rendu du scan de
 * musée avec la patine de l'histoire, fait par le laboratoire (/lab), fond studio compris.
 *
 * Usage : un serveur doit tourner, puis
 *   node scripts/render-story-images.mjs [http://localhost:3000]
 * Sortie : public/images/realisations/<slug>.{avif,webp} (1200 × 1500).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const out = "public/images/realisations";

/** slug → modèle, libellé de patine (radio du lab), angle de vue. */
const STORIES = [
  ["les-traits-d-un-aieul", "buste-romain", "Brun médaille", -20],
  ["le-meme-jour-pour-toujours", "relief-couple", "Doré", -10],
  ["fidele", "tete-de-cheval", "Vert-de-gris", -35],
  ["une-oeuvre-change-de-matiere", "patineuse", "Noir", -25],
  ["ce-qui-se-transmet", "brule-parfum", "Noir", -15],
  ["memoire-commune", "prince-hellenistique", "Vert-de-gris", -20],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-gpu"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  await page.goto(`${base}/lab`, { waitUntil: "load" });
  await page.waitForFunction(() => (window.__monbronzeLab?.fps ?? 0) > 0, null, {
    timeout: 180_000,
  });
  await page.addStyleTag({
    content: `.grain, nextjs-portal, [data-lenis-prevent] > p { display: none !important; }`,
  });
  for (const [slug, model, patine, angle] of STORIES) {
    await page.getByLabel("Modèle").selectOption(model);
    await page.locator("label", { hasText: patine }).first().click();
    await page.getByLabel("Angle de vue").fill(String(angle));
    await page.waitForTimeout(5000);
    const stage = page.locator("[data-lenis-prevent]").first();
    const png = await stage.screenshot();
    const meta = await sharp(png).metadata();
    const h = meta.height;
    const w = Math.round((h * 4) / 5);
    const left = Math.round((meta.width - w) / 2);
    const cut = sharp(png).extract({ left, top: 0, width: w, height: h }).resize(1200, 1500);
    await cut.clone().avif({ quality: 55, effort: 6 }).toFile(`${out}/${slug}.avif`);
    await cut.clone().webp({ quality: 80, effort: 6 }).toFile(`${out}/${slug}.webp`);
    console.log(`${slug} ← ${model} (${patine})`);
  }
} finally {
  await browser.close();
}
