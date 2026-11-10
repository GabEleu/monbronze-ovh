import type { Patine } from "@/content/assets";
import { PATINES } from "@/content/assets";
import { readStorage, writeStorage } from "@/lib/storage";

const KEY = "monbronze:patine-du-jour";

/**
 * « Patine du jour » (BRIEF.md §3.5) : tirée au hasard à la première visite de la session,
 * puis gardée (même patine d'une page à l'autre). Côté client seulement.
 */
export function getPatineDuJour(): Patine {
  const saved = readStorage(KEY, "session") as Patine | null;
  if (saved && (PATINES as readonly string[]).includes(saved)) return saved;
  const picked = PATINES[Math.floor(Math.random() * PATINES.length)] ?? "brun-medaille";
  writeStorage(KEY, picked, "session");
  return picked;
}
