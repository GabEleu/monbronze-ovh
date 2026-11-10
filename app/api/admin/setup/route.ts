import { z } from "zod";
import {
  adminJson,
  deviceCookie,
  hashPassword,
  needsSetup,
  sameOrigin,
  savePasswordHash,
  sessionCookie,
  setupCodeMatches,
  transportOk,
} from "@/lib/admin/auth";
import { clientIp, tooMany } from "@/lib/rate-limit";

/**
 * Première connexion (aucun mot de passe encore) : le code d'installation, affiché à la fin
 * de l'installation du serveur, permet de CHOISIR le mot de passe dans le navigateur. Ensuite
 * cette route ne sert plus (409). Mêmes protections que la connexion : HTTPS, origine,
 * 5 essais par adresse et par quart d'heure.
 */
export async function POST(request: Request) {
  if (!needsSetup()) return adminJson({ error: "Le mot de passe existe déjà." }, 409);
  if (!transportOk(request)) {
    return adminJson({ error: "Connexion sécurisée (HTTPS) requise." }, 403);
  }
  if (!sameOrigin(request)) return adminJson({ error: "Origine refusée." }, 403);
  if (tooMany(`login:${clientIp(request)}`, 5, 15 * 60 * 1000)) {
    return adminJson({ error: "Trop d'essais. Réessayez dans un quart d'heure." }, 429);
  }
  const parsed = z
    .object({ code: z.string().min(1).max(40), password: z.string().max(200) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success || !setupCodeMatches(parsed.data.code)) {
    return adminJson({ error: "Code d'installation incorrect." }, 401);
  }
  if (parsed.data.password.length < 12) {
    return adminJson({ error: "Mot de passe trop court : 12 caractères au moins." }, 400);
  }
  savePasswordHash(await hashPassword(parsed.data.password));
  const res = adminJson({ ok: true }, 200);
  res.headers.append("Set-Cookie", sessionCookie(request));
  res.headers.append("Set-Cookie", deviceCookie(request));
  return res;
}
