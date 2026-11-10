/**
 * Image fixe de la sculpture de l'accueil (version statique : mouvement réduit,
 * expérience allégée, appareil sans WebGL). Rendue par le laboratoire (/lab) avec le
 * matériau bronze du site, sans sol, puis détourée (fond transparent) et compressée.
 *
 * Usage : un serveur doit tourner (npm run dev, ou npm run build && npm start), puis
 *   node scripts/render-hero-image.mjs [http://localhost:3000]
 * Sortie : public/images/hero/buste-romain.{avif,webp} ; reporter largeur et hauteur
 * affichées dans content/assets.ts (heroSculpture.image).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const out = "public/images/hero";
// Même orientation que la sculpture 3D de l'accueil au repos (rotation y = -0,35 rad).
const ANGLE = -20;
const HEIGHT = 960;

const browser = await chromium.launch();
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
  await page.getByLabel("Sol et ombre de contact").uncheck();
  await page.getByLabel("Angle de vue").fill(String(ANGLE));
  // Fond transparent : seul le canvas (alpha) est capturé.
  await page.addStyleTag({
    content: `html, body, [data-lenis-prevent] { background: transparent !important; }
      .grain, nextjs-portal, [data-lenis-prevent] > p { display: none !important; }`,
  });
  await page.waitForTimeout(6000);
  const png = await page.locator("canvas").first().screenshot({ omitBackground: true });

  // Détourage : boîte des pixels opaques de la sculpture, petite marge transparente.
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) throw new Error("Aucune sculpture visible dans le rendu.");
  const crop = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  const cut = sharp(png).extract(crop).resize({ height: HEIGHT });
  mkdirSync(out, { recursive: true });
  const avif = await cut
    .clone()
    .avif({ quality: 55, effort: 6 })
    .toFile(`${out}/buste-romain.avif`);
  await cut
    .clone()
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(`${out}/buste-romain.webp`);
  console.log(`Image : ${avif.width} × ${avif.height} px → ${out}/buste-romain.{avif,webp}`);
} finally {
  await browser.close();
}
