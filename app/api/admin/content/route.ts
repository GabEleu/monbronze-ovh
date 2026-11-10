import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { models } from "@/content/assets";
import { realisationSchema } from "@/content/realisations";
import { site } from "@/content/site";
import { admin } from "@/content/admin";
import { adminJson, guard } from "@/lib/admin/auth";
import { isMuseumRender } from "@/lib/content/resolve";
import { defaultAtelier, defaultPages } from "@/lib/content/editable";
import { atelierSchema, pagesSchema } from "@/lib/content/schemas";
import {
  archive,
  readContentJson,
  realisationsReadDir,
  realisationsWriteDir,
  revalidateContent,
  writableConfigured,
  writeContentJson,
  writeJsonFile,
} from "@/lib/content/store";

/**
 * Contenu modifiable (espace d'administration) : lecture de l'état actuel, enregistrement
 * d'une réalisation, des ateliers ou des pages légales, suppression d'une réalisation.
 * Tout est validé par les mêmes schémas que le site ; le texte est enregistré tel que saisi
 * (la typographie française est appliquée à l'affichage).
 */

async function rawRealisations() {
  const dir = await realisationsReadDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  // Un fichier illisible n'empêche pas d'ouvrir l'administration (il est simplement ignoré).
  const items = await Promise.all(
    files.map(async (f) => {
      try {
        return JSON.parse(await readFile(path.join(dir, f), "utf8")) as unknown;
      } catch {
        return null;
      }
    }),
  );
  return items
    .filter((r): r is { ordre: number } => typeof r === "object" && r !== null)
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}

export async function GET(request: Request) {
  const denied = guard(request, { mutation: false });
  if (denied) return denied;
  const atelier = atelierSchema.safeParse(await readContentJson("atelier"));
  const pages = pagesSchema.safeParse(await readContentJson("pages"));
  return adminJson(
    {
      writable: writableConfigured(),
      realisations: await rawRealisations(),
      atelier: atelier.success ? atelier.data : defaultAtelier(),
      pages: pages.success ? pages.data : defaultPages(),
      options: {
        univers: Object.entries(site.univers).map(([id, u]) => ({ id, label: u.label })),
        etapes: site.steps.map((s) => ({ id: s.id, label: s.title })),
        patines: site.patines.map((p) => ({ id: p.id, label: p.label })),
        // Modèles livrés avec le site (hors filaire et laboratoire), en plus des envois.
        modeles: Object.entries(models)
          .filter(([, m]) => m.role !== "filaire" && m.role !== "laboratoire")
          .map(([id, m]) => ({ id, label: m.subject })),
      },
    },
    200,
  );
}

const putSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("realisation"),
    data: z.unknown(),
    /** Ancien slug, si l'adresse de la page change. */
    previousSlug: z.string().max(100).optional(),
  }),
  z.object({ kind: z.literal("atelier"), data: z.unknown() }),
  z.object({ kind: z.literal("pages"), data: z.unknown() }),
]);

// Messages de validation en français, avec le nom des champs tel qu'affiché dans /admin.
z.config(z.locales.fr());
const f = admin.realisations.fields;
const LABELS: Record<string, string> = {
  titre: f.titre,
  slug: f.slug,
  type: f.type,
  ordre: f.ordre,
  univers: f.univers,
  description: f.description,
  besoin: f.besoin,
  solution: f.solution,
  etapes: f.etapes,
  patine: f.patine,
  visuel: f.visuel,
  modele: f.modele,
  legend: f.legend,
  alt: admin.media.alt,
  gestures: admin.atelier.gesture,
  title: admin.atelier.title,
  text: admin.atelier.text,
  image: admin.atelier.image,
  video: admin.atelier.video,
  coordonnees: admin.pages.coordonnees,
  adresse: admin.pages.adresse,
  telephone: admin.pages.telephone,
  mentions: admin.pages.mentions,
  confidentialite: admin.pages.confidentialite,
  updated: admin.pages.updated,
  sections: admin.pages.section,
  paragraphs: admin.pages.paragraphs,
  list: admin.pages.list,
};
const issues = (error: z.ZodError) =>
  error.issues.map((i) => {
    const where = i.path
      .map((p) =>
        typeof p === "number" ? String(p + 1).padStart(2, "0") : (LABELS[String(p)] ?? String(p)),
      )
      .join(" › ");
    return `${where || "Contenu"}\u00a0: ${i.message}`;
  });

export async function PUT(request: Request) {
  const denied = guard(request, { mutation: true });
  if (denied) return denied;
  if (!writableConfigured()) {
    return adminJson({ error: "CONTENT_DIR n'est pas défini sur le serveur." }, 500);
  }
  const body = putSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return adminJson({ error: "Requête invalide." }, 400);

  if (body.data.kind === "realisation") {
    const parsed = realisationSchema.safeParse(body.data.data);
    if (!parsed.success) {
      return adminJson({ error: admin.common.invalid, details: issues(parsed.error) }, 400);
    }
    // Honnêteté : un rendu d'œuvre de musée n'est jamais une « réalisation réelle ».
    const raw = body.data.data as { visuel?: unknown; modele?: unknown };
    if (parsed.data.type === "reel" && isMuseumRender(raw.visuel, raw.modele)) {
      return adminJson({ error: admin.realisations.museumReel }, 400);
    }
    const slug = parsed.data.slug;
    const dir = await realisationsWriteDir();
    const previous = body.data.previousSlug;
    // Adresse déjà prise par une autre réalisation : refus (rien n'est écrasé).
    const target = path.join(dir, `${slug}.json`);
    const taken = await stat(target).then(
      () => true,
      () => false,
    );
    if (taken && previous !== slug) {
      return adminJson(
        { error: "Cette adresse de page est déjà utilisée par une autre réalisation." },
        409,
      );
    }
    // Enregistré tel que saisi (sans la typographie appliquée par le schéma).
    await writeJsonFile(target, body.data.data);
    if (previous && previous !== slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(previous)) {
      const old = path.join(dir, `${previous}.json`);
      await archive(old);
      await rm(old, { force: true });
    }
  } else {
    const schema = body.data.kind === "atelier" ? atelierSchema : pagesSchema;
    const parsed = schema.safeParse(body.data.data);
    if (!parsed.success) {
      return adminJson({ error: admin.common.invalid, details: issues(parsed.error) }, 400);
    }
    await writeContentJson(body.data.kind, parsed.data);
  }
  revalidateContent();
  return adminJson({ ok: true }, 200);
}

/** Suppression d'une réalisation (une copie reste dans l'historique). Au moins une reste. */
export async function DELETE(request: Request) {
  const denied = guard(request, { mutation: true });
  if (denied) return denied;
  if (!writableConfigured()) {
    return adminJson({ error: "CONTENT_DIR n'est pas défini sur le serveur." }, 500);
  }
  const body = z
    .object({ slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) })
    .safeParse(await request.json().catch(() => null));
  if (!body.success) return adminJson({ error: "Requête invalide." }, 400);
  const dir = await realisationsWriteDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  if (files.length <= 1) {
    return adminJson({ error: "Gardez au moins une réalisation." }, 400);
  }
  const file = path.join(dir, `${body.data.slug}.json`);
  const found = await stat(file).then(
    () => true,
    () => false,
  );
  if (!found) return adminJson({ error: "Réalisation introuvable." }, 404);
  await archive(file);
  await rm(file, { force: true });
  revalidateContent();
  return adminJson({ ok: true }, 200);
}
