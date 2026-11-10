import { z } from "zod";
import {
  adminConfigured,
  adminJson,
  clearedCookie,
  deviceCookie,
  isAuthenticated,
  isKnownDevice,
  needsSetup,
  renewEpoch,
  sameOrigin,
  sessionCookie,
  transportOk,
  verifyPassword,
} from "@/lib/admin/auth";
import { clientIp, recentCount, tooMany } from "@/lib/rate-limit";

/** État de la session (l'interface d'administration le lit à l'ouverture). */
export async function GET(request: Request) {
  return adminJson(
    {
      configured: adminConfigured(),
      needsSetup: needsSetup(),
      authenticated: isAuthenticated(request),
    },
    200,
  );
}

/**
 * Connexion : 5 essais par adresse et par 15 minutes ; au-delà de 50 ÉCHECS par heure sur
 * tout le site, seuls les navigateurs déjà connectés avec succès (cookie d'appareil) peuvent
 * encore essayer : un tiers ne peut pas bloquer la fonderie.
 */
export async function POST(request: Request) {
  if (!adminConfigured())
    return adminJson({ error: "Espace d'administration non configuré." }, 503);
  if (!transportOk(request))
    return adminJson({ error: "Connexion sécurisée (HTTPS) requise." }, 403);
  if (!sameOrigin(request)) return adminJson({ error: "Origine refusée." }, 403);
  const ip = clientIp(request);
  const HOUR = 3600 * 1000;
  const siteLocked = recentCount("login-echec:site", HOUR) >= 50 && !isKnownDevice(request);
  if (tooMany(`login:${ip}`, 5, 15 * 60 * 1000) || siteLocked) {
    return adminJson({ error: "Trop d'essais. Réessayez dans un quart d'heure." }, 429);
  }
  const parsed = z
    .object({ password: z.string().min(1).max(200) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(await verifyPassword(parsed.data.password))) {
    tooMany("login-echec:site", Number.MAX_SAFE_INTEGER, HOUR);
    return adminJson({ error: "Mot de passe incorrect." }, 401);
  }
  const res = adminJson({ ok: true }, 200);
  res.headers.append("Set-Cookie", sessionCookie(request));
  res.headers.append("Set-Cookie", deviceCookie(request));
  return res;
}

/** Déconnexion : révoque toutes les sessions ouvertes (nouvelle époque). */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return adminJson({ error: "Origine refusée." }, 403);
  if (isAuthenticated(request)) renewEpoch();
  const res = adminJson({ ok: true }, 200);
  res.headers.set("Set-Cookie", clearedCookie());
  return res;
}
