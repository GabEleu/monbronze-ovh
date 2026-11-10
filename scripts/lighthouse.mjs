/**
 * Audit Lighthouse (mobile et desktop) des pages principales, sur le build de production.
 * Usage : npm run build && npm run lighthouse
 * Résultats : tableau dans la console + rapports JSON dans reports/.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const ONLY = process.argv[2];
const ROUTES_ALL = [
  "/",
  "/concept",
  "/comment-ca-marche",
  "/realisations",
  "/realisations/fidele",
  "/qui-sommes-nous",
  "/contact",
  "/mentions-legales",
  "/credits",
];
const TARGETS = { accessibility: 95, "best-practices": 95, seo: 95, performance: 80 };

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* pas encore prêt */
    }
    await sleep(500);
  }
  throw new Error("Le serveur de production ne répond pas.");
}

// Un serveur déjà présent sur ce port servirait un ancien build (erreurs 500 sur les fichiers).
try {
  await fetch(BASE);
  console.error(`Le port ${PORT} est déjà occupé : arrêter l'ancien serveur avant l'audit.`);
  process.exit(1);
} catch {
  /* port libre : on continue */
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  shell: true,
  stdio: "ignore",
});
const stop = () => {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { shell: true });
    // Filet de sécurité : tout processus encore à l'écoute sur le port est arrêté.
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`,
      ],
      { stdio: "ignore" },
    );
  } else server.kill("SIGTERM");
};

try {
  await waitForServer();
  mkdirSync("reports", { recursive: true });
  // Chromium lancé par Playwright (chrome-launcher échoue sous Windows dans certains environnements).
  const DEBUG_PORT = 9223;
  const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] });
  const chrome = { port: DEBUG_PORT, kill: () => browser.close() };

  const rows = [];
  let failed = false;
  for (const formFactor of ["mobile", "desktop"]) {
    const ROUTES = ONLY ? ROUTES_ALL.filter((r) => r === ONLY) : ROUTES_ALL;
    for (const route of ROUTES) {
      const result = await lighthouse(
        `${BASE}${route}`,
        { port: chrome.port, output: "json", logLevel: "error", locale: "fr" },
        formFactor === "desktop" ? desktopConfig : undefined,
      );
      const { categories } = result.lhr;
      const scores = Object.fromEntries(
        Object.keys(TARGETS).map((k) => [k, Math.round((categories[k]?.score ?? 0) * 100)]),
      );
      const ok = Object.entries(TARGETS).every(([k, min]) => scores[k] >= min);
      if (!ok) failed = true;
      rows.push({ formFactor, route, ...scores, ok: ok ? "✓" : "✗" });
      const name = `${formFactor}${route.replaceAll("/", "_") || "_accueil"}`;
      writeFileSync(`reports/lighthouse-${name}.json`, result.report);
    }
  }
  await chrome.kill();
  console.table(rows);
  console.log(
    `Objectifs : ${Object.entries(TARGETS)
      .map(([k, v]) => `${k} ≥ ${v}`)
      .join(", ")}`,
  );
  if (failed) process.exitCode = 1;
} finally {
  stop();
}
