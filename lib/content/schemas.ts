import { z } from "zod";

/**
 * Schémas du contenu modifiable depuis l'espace d'administration (/admin). Sans accès
 * disque : partagés par le serveur (validation à l'écriture et à la lecture) et par
 * l'interface d'administration (validation avant envoi).
 */

/** Chemin local d'un fichier servi par le site (dossier public ou médias envoyés). */
export const localPath = z
  .string()
  .max(300)
  .regex(/^\/(media|atelier|images|models)\/[A-Za-z0-9/_.-]+$/, "Chemin de fichier invalide.")
  .refine((p) => !p.includes(".."), "Chemin de fichier invalide.");

export const mediaImageSchema = z.object({
  src: localPath,
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  /** Texte alternatif (accessibilité) : décrit ce que montre l'image. */
  alt: z.string().trim().min(1, "Décrivez l'image en quelques mots.").max(300),
});

export const mediaVideoSchema = z.object({
  src: localPath.refine((p) => p.endsWith(".mp4"), "Vidéo MP4 attendue."),
  poster: localPath,
});

/** Modèle 3D envoyé par l'espace d'administration (préparé dans le navigateur). */
export const mediaModelSchema = z.object({
  src: z.string().regex(/^\/media\/modeles\/[0-9a-f-]{36}\.glb$/, "Modèle invalide."),
  /** Légende facultative affichée sous le rendu (ex. « Rendu numérique d'après … »). */
  legend: z.string().trim().max(300).optional(),
});

const shortText = (max: number) => z.string().trim().min(1, "Champ obligatoire.").max(max);

/** Les ateliers (accueil, section 4) : un geste = un titre, un texte, une photo, une vidéo. */
export const atelierSchema = z.object({
  gestures: z
    .array(
      z.object({
        title: shortText(120),
        text: shortText(600),
        image: mediaImageSchema,
        video: mediaVideoSchema.optional(),
      }),
    )
    .min(1)
    .max(12),
});
export type AtelierContent = z.infer<typeof atelierSchema>;

const legalSection = z.object({
  title: shortText(150),
  paragraphs: z.array(z.string().trim().min(1).max(3000)).min(1).max(30),
  list: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
});
const legalPage = z.object({
  updated: shortText(120),
  sections: z.array(legalSection).min(1).max(40),
});

/** Coordonnées (pied de page) et pages légales. */
export const pagesSchema = z.object({
  coordonnees: z.object({
    adresse: z.string().trim().max(300),
    telephone: z.string().trim().max(40),
  }),
  mentions: legalPage,
  confidentialite: legalPage,
});
export type PagesContent = z.infer<typeof pagesSchema>;
