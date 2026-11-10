/**
 * Accès sûr à localStorage / sessionStorage : peut lever une exception
 * (navigation privée, stockage bloqué, aperçu). Toujours passer par ici.
 */
type Area = "local" | "session";

function area(kind: Area): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStorage(key: string, kind: Area = "local"): string | null {
  try {
    return area(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string, kind: Area = "local"): void {
  try {
    area(kind)?.setItem(key, value);
  } catch {
    /* stockage indisponible : on ignore, le site fonctionne sans */
  }
}

export const STORAGE_KEYS = {
  lite: "monbronze:experience-allegee",
  sound: "monbronze:son",
  introSeen: "monbronze:intro-vue",
} as const;
