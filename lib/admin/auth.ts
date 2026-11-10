import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { contentDir } from "@/lib/content/store";

/**
 * Espace d'administration : un seul compte (la fonderie), sans base de données.
 *
 * - ADMIN_PASSWORD_HASH : empreinte scrypt du mot de passe, produite par
 *   `node scripts/admin-password.mjs` (le mot de passe lui-même n'est stocké nulle part).
 * - ADMIN_SESSION_SECRET : 32 caractères ou plus ; signe le cookie de session (HMAC).
 *   Le changer déconnecte tout le monde.
 * Sans ces deux variables, l'espace d'administration est désactivé (503).
 *
 * Session : cookie `mb_admin` = « expiration.signature », HttpOnly, SameSite=Strict, Secure
 * en HTTPS, valable 12 heures. Toute modification exige en plus un en-tête Origin du site
 * (protection CSRF en plus de SameSite). En production, connexion refusée hors HTTPS.
 *
 * Déconnexion = révocation : la signature inclut une « époque » (CONTENT_DIR/.session),
 * renouvelée à chaque déconnexion ; toutes les sessions ouvertes deviennent invalides.
 * Appareil connu : cookie `mb_appareil` (1 an) posé à la connexion réussie ; il dispense de
 * la limite globale d'essais, qu'un tiers ne peut donc pas utiliser pour bloquer la fonderie.
 */
const COOKIE = "mb_admin";
const SESSION_SECONDS = 12 * 3600;

const secret = () => process.env.ADMIN_SESSION_SECRET ?? "";

/**
 * Empreinte du mot de passe : variable ADMIN_PASSWORD_HASH (script admin-password.mjs), ou
 * fichier CONTENT_DIR/.admin-password écrit à la PREMIÈRE CONNEXION dans le navigateur
 * (avec le code d'installation ADMIN_SETUP_CODE, affiché à la fin de l'installation).
 */
let fileHash: string | null | undefined;
const hashFile = () => path.join(contentDir(), ".admin-password");

function passwordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  if (fileHash === undefined) {
    try {
      fileHash = readFileSync(hashFile(), "utf8").trim() || null;
    } catch {
      fileHash = null;
    }
  }
  return fileHash;
}

const setupCode = () => (process.env.ADMIN_SETUP_CODE ?? "").replace(/[^A-Z0-9]/gi, "");

export function adminConfigured() {
  return secret().length >= 32 && (Boolean(passwordHash()) || setupCode().length >= 8);
}

/** Aucun mot de passe encore : la première connexion le crée (avec le code d'installation). */
export function needsSetup() {
  return adminConfigured() && !passwordHash();
}

/** Compare le code saisi (casse, espaces et tirets indifférents) au code d'installation. */
export function setupCodeMatches(given: string) {
  const expected = Buffer.from(setupCode().toUpperCase());
  const actual = Buffer.from(given.replace(/[^A-Z0-9]/gi, "").toUpperCase());
  return (
    expected.length >= 8 && expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export async function hashPassword(password: string) {
  const N = 2 ** 15;
  const salt = randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password.normalize("NFC"),
      salt,
      32,
      { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (e, k) => (e ? reject(e) : resolve(k)),
    ),
  );
  return `scrypt.${N}.8.1.${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

/** Enregistre le mot de passe choisi à la première connexion (fichier lisible du seul service). */
export function savePasswordHash(hash: string) {
  mkdirSync(contentDir(), { recursive: true });
  writeFileSync(hashFile(), hash, { mode: 0o600 });
  fileHash = hash;
}

/**
 * Format : scrypt.N.r.p.sel.empreinte (base64url). Ni « $ » ni guillemets : la valeur passe
 * telle quelle dans .env.local (Next développe les « $ »), un EnvironmentFile systemd et le
 * build (fichier chargé par bash).
 */
export async function verifyPassword(password: string) {
  const parts = (passwordHash() ?? "").split(".");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, "base64url");
  const derived = await new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password.normalize("NFC"),
      Buffer.from(saltB64, "base64url"),
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 },
      (err, key) => (err ? reject(err) : resolve(key)),
    ),
  );
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

const DEVICE = "mb_appareil";
const DEVICE_SECONDS = 365 * 24 * 3600;

let epoch: string | null = null;
const epochFile = () => path.join(contentDir(), ".session");

/** Époque des sessions (lue une fois, puis gardée en mémoire : un seul processus). */
function sessionEpoch() {
  if (epoch) return epoch;
  try {
    epoch = readFileSync(epochFile(), "utf8").trim() || null;
  } catch {
    /* pas encore créée */
  }
  if (!epoch) renewEpoch();
  return epoch!;
}

/** Nouvelle époque : toutes les sessions ouvertes deviennent invalides. */
export function renewEpoch() {
  epoch = randomBytes(16).toString("base64url");
  try {
    mkdirSync(contentDir(), { recursive: true });
    writeFileSync(epochFile(), epoch, { mode: 0o600 });
  } catch {
    /* dossier non inscriptible : l'époque vit en mémoire (sessions perdues au redémarrage) */
  }
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("base64url");

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function validSigned(value: string | null, payload: (exp: string) => string) {
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(payload(exp)));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function isAuthenticated(request: Request) {
  if (!adminConfigured()) return false;
  return validSigned(cookieValue(request, COOKIE), (exp) => `mb_admin:${exp}:${sessionEpoch()}`);
}

/** Navigateur déjà connecté avec succès (dispense de la limite globale d'essais). */
export function isKnownDevice(request: Request) {
  if (!adminConfigured()) return false;
  return validSigned(cookieValue(request, DEVICE), (exp) => `mb_appareil:${exp}`);
}

export function deviceCookie(request: Request) {
  const exp = String(Math.floor(Date.now() / 1000) + DEVICE_SECONDS);
  const secure = isHttps(request) ? "; Secure" : "";
  return `${DEVICE}=${exp}.${sign(`mb_appareil:${exp}`)}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${DEVICE_SECONDS}${secure}`;
}

function isHttps(request: Request) {
  return (
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:"
  );
}

function isLocal(request: Request) {
  const host = (request.headers.get("host") ?? "").split(":")[0];
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** En production, aucun mot de passe ne circule en clair (sauf sur la machine elle-même). */
export function transportOk(request: Request) {
  return process.env.NODE_ENV !== "production" || isHttps(request) || isLocal(request);
}

export function sessionCookie(request: Request) {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const secure = isHttps(request) ? "; Secure" : "";
  const sig = sign(`mb_admin:${exp}:${sessionEpoch()}`);
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearedCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/**
 * La requête vient bien d'une page du site (en-tête Origin = hôte de la requête). Seul
 * l'en-tête Host compte : Nginx le fixe (proxy_set_header Host $host) ; un X-Forwarded-Host
 * envoyé par un client n'est pas pris en compte.
 */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Garde commune des routes /api/admin/* : renvoie une réponse d'erreur, ou null si la
 * requête peut continuer.
 */
export function guard(request: Request, { mutation }: { mutation: boolean }) {
  if (!adminConfigured()) {
    return json({ error: "Espace d'administration non configuré." }, 503);
  }
  if (!transportOk(request)) return json({ error: "Connexion sécurisée (HTTPS) requise." }, 403);
  if (mutation && !sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  if (!isAuthenticated(request)) return json({ error: "Session expirée : reconnectez-vous." }, 401);
  return null;
}

export { json as adminJson };
