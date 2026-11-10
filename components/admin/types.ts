import type { AtelierContent, PagesContent } from "@/lib/content/schemas";
import type { MediaImage } from "@/components/admin/fields";

/** Réalisation telle qu'enregistrée (texte saisi, sans typographie appliquée). */
export type RawRealisation = {
  slug: string;
  /** Choix explicite à la création (null : pas encore choisi). */
  type: "illustratif" | "reel" | null;
  ordre: number;
  univers: string;
  titre: string;
  description: string;
  /** Identifiant d'un visuel du site, ou photo envoyée (null : pas encore choisie). */
  visuel: string | MediaImage | null;
  besoin: string;
  solution: string;
  etapes: string[];
  patine?: string;
  modele?: string | { src: string; legend?: string };
};

type Option = { id: string; label: string };

/** Réponse de GET /api/admin/content. */
export type AdminData = {
  writable: boolean;
  realisations: RawRealisation[];
  atelier: AtelierContent;
  pages: PagesContent;
  options: { univers: Option[]; etapes: Option[]; patines: Option[]; modeles: Option[] };
};
