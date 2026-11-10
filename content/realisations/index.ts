/**
 * Réalisations : une histoire = un fichier JSON.
 * - Livrées avec le code : ce dossier (validées par zod au build ; un fichier invalide fait
 *   échouer le build).
 * - Une fois modifiées depuis l'espace d'administration : CONTENT_DIR/realisations/
 *   (lib/content/store.ts), lu à la place de ce dossier, sans reconstruire le site.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { assets, models, PATINES } from "@/content/assets";
import { frTypo } from "@/lib/fr";
import { mediaImageSchema, mediaModelSchema } from "@/lib/content/schemas";
import { CONTENT_TAG, realisationsReadDir } from "@/lib/content/store";

export const STEP_IDS = [
  "capturer",
  "modeliser",
  "fabriquer",
  "mouler-et-fondre",
  "ciseler-et-patiner",
] as const;
export const UNIVERS_IDS = [
  "memoire",
  "amour",
  "fidelite",
  "creation",
  "transmission",
  "patrimoine",
] as const;
const assetIds = Object.keys(assets) as [keyof typeof assets, ...(keyof typeof assets)[]];

const text = z
  .string()
  .min(1)
  .transform((s) => frTypo(s));

export const realisationSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug en minuscules, sans accent, séparé par des tirets"),
  /** "illustratif" tant que la fonderie n'a pas fourni de vraie réalisation. */
  type: z.enum(["illustratif", "reel"]),
  ordre: z.number().int(),
  univers: z.enum(UNIVERS_IDS),
  titre: text,
  description: text,
  /** Visuel de content/assets.ts, ou photo envoyée depuis /admin. */
  visuel: z.union([z.enum(assetIds), mediaImageSchema]),
  besoin: text,
  solution: text,
  etapes: z.array(z.enum(STEP_IDS)).min(1),
  patine: z.enum(PATINES).optional(),
  /** Scan 3D affiché en temps réel sur la page de l'histoire : modèle de content/assets.ts,
   * ou modèle envoyé (et préparé) depuis /admin. */
  modele: z
    .union([
      z.enum(Object.keys(models) as [keyof typeof models, ...(keyof typeof models)[]]),
      mediaModelSchema,
    ])
    .optional(),
});

export type Realisation = z.infer<typeof realisationSchema>;

/** Toutes les réalisations, triées par `ordre`. Lecture mise en cache (Cache Components). */
export async function getRealisations(): Promise<Realisation[]> {
  "use cache";
  // Le contenu change au déploiement ou depuis /admin (étiquette invalidée à l'écriture).
  // « hours » : une modification faite depuis /admin ne peut jamais être masquée plus d'une
  // heure (l'invalidation par étiquette vit en mémoire et se perd à un redémarrage).
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const DIR = await realisationsReadDir();
  // Dossier du code : un fichier invalide fait échouer le build. Dossier de /admin : il est
  // ignoré et journalisé, le site reste en ligne.
  const strict = !process.env.CONTENT_DIR || !DIR.startsWith(process.env.CONTENT_DIR);
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
  const items = await Promise.all(
    files.map(async (file) => {
      let json: unknown = null;
      try {
        json = JSON.parse(await readFile(path.join(DIR, file), "utf8"));
      } catch (error) {
        if (strict) throw error;
      }
      const parsed = realisationSchema.safeParse(json);
      if (!parsed.success && !strict) {
        console.error(`[contenu] réalisation ignorée (fichier invalide) : ${file}`);
        return null;
      }
      if (!parsed.success) {
        throw new Error(
          `content/realisations/${file} invalide :\n${z.prettifyError(parsed.error)}`,
        );
      }
      if (`${parsed.data.slug}.json` !== file && !strict) {
        console.error(`[contenu] réalisation ignorée (nom de fichier ≠ adresse) : ${file}`);
        return null;
      }
      if (`${parsed.data.slug}.json` !== file) {
        throw new Error(
          `content/realisations/${file} : le nom du fichier doit être « ${parsed.data.slug}.json »`,
        );
      }
      return parsed.data;
    }),
  );
  return items.filter((r): r is Realisation => r !== null).sort((a, b) => a.ordre - b.ordre);
}

export async function getRealisation(slug: string) {
  const all = await getRealisations();
  const index = all.findIndex((r) => r.slug === slug);
  if (index === -1) return null;
  const n = all.length;
  return {
    realisation: all[index]!,
    prev: all[(index - 1 + n) % n]!,
    next: all[(index + 1) % n]!,
  };
}
