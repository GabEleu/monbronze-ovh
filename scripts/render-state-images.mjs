/**
 * Images fixes des états de la sculpture (points, filaire, cire, bronze) pour le menu plein
 * écran (BRIEF.md §3.6 : « au survol de chaque lien, la sculpture change d'état »).
 * Capturées dans la métamorphose de l'accueil (WebGL forcé), fond charbon.
 *   node scripts/render-state-images.mjs [http://localhost:3000]
 * Sortie : public/images/etats/<etat>.{avif,webp} (600 × 1000).
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const out = "public/images/etats";
const STATES = [
  ["points", 0.05],
  ["filaire", 0.3],
  ["cire", 0.64],
  ["bronze", 0.97],
];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--ignore-gpu-blocklist", "--enable-gpu"] });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(() => {
    localStorage.setItem("monbronze:forcer-webgl", "1");
    sessionStorage.setItem("monbronze:intro-vue", "1");
  });
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.webgl === "ready", null, {
    timeout: 120_000,
  });
  await page.keyboard.press("Escape");
  await page.waitForSelector(".metamorph[data-pinned]", { timeout: 90_000 });
  await page.addStyleTag({ content: ".grain, nextjs-portal { display: none !important; }" });
  for (const [name, p] of STATES) {
    await page.evaluate((p) => {
      const track = document.querySelector(".metamorph-track");
      const stage = document.querySelector(".metamorph-stage");
      const header = document.querySelector("header").getBoundingClientRect().height;
      const top = track.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo(0, top + (track.offsetHeight - stage.offsetHeight) * p);
    }, p);
    await page.waitForTimeout(2500);
    const box = await page.locator(".metamorph-visual").boundingBox();
    const shot = await page.screenshot({ clip: box });
    const img = sharp(shot).resize(600, 1000, { fit: "cover" });
    await img.clone().avif({ quality: 50, effort: 6 }).toFile(`${out}/${name}.avif`);
    await img.clone().webp({ quality: 78, effort: 6 }).toFile(`${out}/${name}.webp`);
    console.log(name);
  }
} finally {
  await browser.close();
}
