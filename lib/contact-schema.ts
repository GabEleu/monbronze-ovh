import { z } from "zod";
import { PATINES } from "@/content/assets";

/**
 * Formulaire de contact (BRIEF.md §7) : un seul schéma, validé dans le navigateur
 * (react-hook-form) ET sur le serveur (route /api/contact).
 */
export const SOURCES = [
  "sculpture",
  "objet",
  "fichier",
  "photos",
  "impression",
  "inconnu",
] as const;
export const UNIVERS = [
  "memoire",
  "amour",
  "fidelite",
  "creation",
  "transmission",
  "patrimoine",
  "autre",
] as const;

/** Formats et limites des pièces jointes (configurables ici). */
export const UPLOAD = {
  extensions: [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "heic",
    "tif",
    "tiff",
    "pdf",
    "stl",
    "obj",
    "glb",
    "gltf",
    "ply",
    "3mf",
    "zip",
  ],
  maxFiles: 10,
  maxBytes: 50 * 1024 * 1024,
} as const;

export const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Forme exacte des clés d'objet produites par le serveur (lib/object-storage.ts). */
export const OBJECT_KEY =
  /^demandes\/\d{4}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,120}$/;

export const fileSchema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().nonnegative().max(UPLOAD.maxBytes),
  /** Clé de l'objet dans le stockage privé ; vide en mode simulé. */
  key: z.string().refine((k) => k === "" || OBJECT_KEY.test(k), "Fichier invalide."),
});

export const contactSchema = z.object({
  source: z.enum(SOURCES, { message: "Choisissez le point de départ de votre projet." }),
  patine: z.enum(PATINES).optional().or(z.literal("")),
  demande: z
    .string()
    .trim()
    .min(10, "Décrivez votre idée en quelques mots (10 caractères au moins).")
    .max(5000, "5 000 caractères au maximum."),
  univers: z.enum(UNIVERS).optional().or(z.literal("")),
  fichiers: z.array(fileSchema).max(UPLOAD.maxFiles, `${UPLOAD.maxFiles} fichiers au maximum.`),
  prenom: z.string().trim().min(1, "Indiquez votre prénom.").max(100),
  nom: z.string().trim().min(1, "Indiquez votre nom.").max(100),
  email: z.string().trim().email("Indiquez une adresse e-mail valide, par exemple nom@exemple.fr."),
  telephone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ().-]*$/, "Le numéro ne peut contenir que des chiffres, espaces et + ( ) . -")
    .optional()
    .or(z.literal("")),
  consentement: z.literal(true, {
    message: "Votre accord est nécessaire pour que nous puissions vous répondre.",
  }),
  /** Champ piège invisible : doit rester vide. */
  site: z.string().max(500).optional(),
  /** Jeton Cloudflare Turnstile (vide sans clé : mode simulé). */
  turnstile: z.string().optional().or(z.literal("")),
});

export type ContactData = z.infer<typeof contactSchema>;
export type ContactFile = z.infer<typeof fileSchema>;
