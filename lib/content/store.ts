import { randomUUID } from "node:crypto";
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidateTag } from "next/cache";

/**
 * Contenu modifiable sans reconstruire le site (espace d'administration).
 *
 * - CONTENT_DIR (production : /srv/monbronze/shared/content, hors des versions déployées) :
 *   fichiers JSON écrits par /admin. À défaut, `.content/` dans le dossier du projet
 *   (développement et tests, ignoré par git).
 * - MEDIA_DIR (production : /srv/monbronze/shared/media) : photos, vidéos et modèles 3D
 *   envoyés, servis sous /media/… (Nginx en production, app/media en développement).
 * - Tant qu'un fichier n'a jamais été modifié, le site lit le contenu livré avec le code
 *   (content/realisations/*.json, textes de content/site.ts, visuels de content/assets.ts).
 *
 * Chaque écriture est atomique (fichier temporaire puis renommage) et garde l'ancienne
 * version dans `.historique/` (30 dernières par fichier) : une erreur se rattrape.
 * Toutes les lectures publiques portent l'étiquette de cache « contenu » : une écriture
 * l'invalide, les pages concernées se régénèrent à la visite suivante.
 */
export const CONTENT_TAG = "contenu";

const BUNDLED = path.join(process.cwd(), "content");

export function contentDir() {
  return process.env.CONTENT_DIR || path.join(process.cwd(), ".content");
}

export function mediaDir() {
  return process.env.MEDIA_DIR || path.join(process.cwd(), ".media");
}

/** En production, écrire dans le dossier de la version déployée serait perdu au déploiement suivant. */
export function writableConfigured() {
  return process.env.NODE_ENV !== "production" || Boolean(process.env.CONTENT_DIR);
}

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false,
  );

/** Dossier des réalisations à LIRE : le dossier modifiable s'il existe, sinon celui du code. */
export async function realisationsReadDir() {
  const own = path.join(contentDir(), "realisations");
  return (await exists(own)) ? own : path.join(BUNDLED, "realisations");
}

/** Dossier des réalisations à ÉCRIRE, initialisé avec celles du code au premier usage. */
export async function realisationsWriteDir() {
  const own = path.join(contentDir(), "realisations");
  if (!(await exists(own))) {
    await mkdir(contentDir(), { recursive: true });
    await cp(path.join(BUNDLED, "realisations"), own, {
      recursive: true,
      filter: (src) => !src.endsWith(".ts"),
    });
  }
  return own;
}

/** Fichier JSON modifiable (null s'il n'existe pas encore). */
export async function readContentJson(name: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path.join(contentDir(), `${name}.json`), "utf8"));
  } catch {
    return null;
  }
}

/** Copie la version actuelle d'un fichier dans .historique/<dossier>/ (30 par fichier). */
export async function archive(file: string) {
  if (!(await exists(file))) return;
  const rel = path.relative(contentDir(), path.dirname(file));
  const history = path.join(contentDir(), ".historique", rel === "" ? "." : rel);
  await mkdir(history, { recursive: true });
  const base = path.basename(file, ".json");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await cp(file, path.join(history, `${base}.${stamp}.json`));
  const old = (await readdir(history)).filter((f) => f.startsWith(`${base}.`)).sort();
  for (const f of old.slice(0, Math.max(0, old.length - 30))) {
    await rm(path.join(history, f), { force: true });
  }
}

/** Écriture atomique (fichier temporaire unique, puis renommage), ancienne version archivée. */
export async function writeJsonFile(file: string, data: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await archive(file);
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tmp, file);
}

export async function writeContentJson(name: string, data: unknown) {
  await writeJsonFile(path.join(contentDir(), `${name}.json`), data);
}

/** Les pages qui lisent le contenu se régénèrent à la prochaine visite (sans contenu périmé). */
export function revalidateContent() {
  revalidateTag(CONTENT_TAG, { expire: 0 });
}
