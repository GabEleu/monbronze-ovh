import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Tests et captures sur le BUILD DE PRODUCTION (`npm run build` d'abord).
 * Deux projets : desktop 1440 px et mobile 390 px (BRIEF.md §0).
 */
const PORT = 3100;

/**
 * Espace d'administration : valeurs DE TEST (jamais celles de la production). Le contenu et
 * les médias écrits par les tests vont dans un dossier temporaire, vidé à chaque lancement.
 */
export const ADMIN_TEST_PASSWORD = "mot-de-passe-de-test-admin";
const TEST_DATA = path.join(tmpdir(), "monbronze-tests");
if (!process.env.TEST_WORKER_INDEX) {
  rmSync(TEST_DATA, { recursive: true, force: true });
  mkdirSync(TEST_DATA, { recursive: true });
}
const salt = randomBytes(16);
const hash = scryptSync(ADMIN_TEST_PASSWORD, salt, 32, {
  N: 2 ** 15,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
});

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ADMIN_PASSWORD_HASH: `scrypt.${2 ** 15}.8.1.${salt.toString("base64url")}.${hash.toString("base64url")}`,
      ADMIN_SESSION_SECRET: "secret-de-session-de-test-uniquement-0123456789",
      CONTENT_DIR: path.join(TEST_DATA, "content"),
      MEDIA_DIR: path.join(TEST_DATA, "media"),
    },
  },
});
