import { assets, models, type AssetId, type ModelId, type VisualAsset } from "@/content/assets";
import { site } from "@/content/site";
import { frTypo } from "@/lib/fr";
import type { Realisation } from "@/content/realisations";

/**
 * Une réalisation référence soit un visuel ou un modèle de content/assets.ts (livrés avec
 * le code), soit un fichier envoyé depuis l'espace d'administration (/media/…).
 */
export function realisationVisual(r: Realisation): VisualAsset {
  if (typeof r.visuel === "string") return assets[r.visuel];
  return { kind: "image", subject: r.titre, ...r.visuel };
}

export function realisationModel(r: Realisation): { src: string } | undefined {
  if (!r.modele) return undefined;
  return { src: typeof r.modele === "string" ? models[r.modele].src : r.modele.src };
}

/**
 * Légende affichée sous l'image ou la sculpture. Rendu d'une œuvre de musée (modèle OU
 * visuel du site) : toujours « Rendu numérique d'après … », même sans sculpture 3D (personne
 * ne doit croire que la fonderie revendique l'œuvre). Modèle envoyé : légende saisie.
 */
export function realisationCaption(r: Realisation): string | undefined {
  const museum = (legend?: string) =>
    legend ? `${site.realisations.render} ${legend}` : undefined;
  if (typeof r.modele === "string" && models[r.modele].legend) {
    return museum(models[r.modele].legend);
  }
  if (typeof r.visuel === "string") {
    const v = assets[r.visuel];
    if (v.kind === "image" && v.legend) return museum(v.legend);
  }
  if (r.modele && typeof r.modele === "object" && r.modele.legend) {
    return frTypo(r.modele.legend);
  }
  return undefined;
}

/**
 * Vrai si la photo ou la sculpture est un rendu d'une œuvre de musée : une telle page ne
 * peut jamais être présentée comme une « réalisation réelle » de la fonderie.
 */
export function isMuseumRender(visuel: unknown, modele: unknown): boolean {
  const v = typeof visuel === "string" ? assets[visuel as AssetId] : undefined;
  const m = typeof modele === "string" ? models[modele as ModelId] : undefined;
  return Boolean((v?.kind === "image" && v.legend) || m?.legend);
}
