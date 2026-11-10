import { cacheLife, cacheTag } from "next/cache";
import { assets } from "@/content/assets";
import { site } from "@/content/site";
import { frTypo } from "@/lib/fr";
import { CONTENT_TAG, readContentJson } from "@/lib/content/store";
import {
  atelierSchema,
  pagesSchema,
  type AtelierContent,
  type PagesContent,
} from "@/lib/content/schemas";

/**
 * Contenu modifiable depuis /admin, avec la version livrée avec le code comme valeur par
 * défaut. Lectures mises en cache (étiquette « contenu », invalidée à chaque écriture).
 */

/** Ateliers tels que livrés avec le code (textes de site.ts, photos de assets.ts). */
export function defaultAtelier(): AtelierContent {
  return {
    gestures: site.home.ateliers.gestures.map((g) => {
      const a = assets[g.asset];
      if (a.kind !== "image") throw new Error(`Visuel d'atelier non image : ${g.asset}`);
      return {
        title: g.title,
        text: g.text,
        image: { src: a.src, width: a.width, height: a.height, alt: a.alt },
        ...(a.video ? { video: a.video } : {}),
      };
    }),
  };
}

export function defaultPages(): PagesContent {
  const legal = (p: typeof site.legal.mentions) => ({
    updated: p.updated,
    sections: p.sections.map((s) => ({
      title: s.title,
      paragraphs: [...s.paragraphs],
      ...("list" in s && s.list ? { list: [...(s.list as readonly string[])] } : {}),
    })),
  });
  return {
    // Vides = « [À COMPLÉTER] » affiché (aucun fait inventé).
    coordonnees: { adresse: "", telephone: "" },
    mentions: legal(site.legal.mentions),
    confidentialite: legal(site.legal.privacy),
  };
}

/** Applique la typographie française aux textes saisis (idempotent). */
function typo<T>(value: T): T {
  if (typeof value === "string") return frTypo(value) as T;
  if (Array.isArray(value)) return value.map(typo) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, /^(src|poster)$/.test(k) ? v : typo(v)]),
    ) as T;
  }
  return value;
}

export async function getAtelier(): Promise<AtelierContent> {
  "use cache";
  // « hours » : une modification faite depuis /admin ne peut jamais être masquée plus d'une
  // heure (l'invalidation par étiquette vit en mémoire et se perd à un redémarrage).
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const parsed = atelierSchema.safeParse(await readContentJson("atelier"));
  return parsed.success ? typo(parsed.data) : defaultAtelier();
}

export async function getPages(): Promise<PagesContent> {
  "use cache";
  // « hours » : une modification faite depuis /admin ne peut jamais être masquée plus d'une
  // heure (l'invalidation par étiquette vit en mémoire et se perd à un redémarrage).
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const parsed = pagesSchema.safeParse(await readContentJson("pages"));
  return parsed.success ? typo(parsed.data) : defaultPages();
}
