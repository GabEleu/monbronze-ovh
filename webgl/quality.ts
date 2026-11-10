import { readStorage, writeStorage } from "@/lib/storage";

/**
 * Niveau de qualité de l'expérience (BRIEF.md §3.7).
 * - high   : tous les effets ;
 * - medium : fluide basse résolution, densité de pixels réduite ;
 * - off    : aucun WebGL → visuels statiques. C'est le cas des appareils sans WebGL2,
 *            sans cibles demi-flottantes, à très faible mémoire, et des rendus LOGICIELS
 *            (SwiftShader, llvmpipe, « Basic Render Driver ») : sans carte graphique,
 *            la coulée bloquerait le processeur.
 * La détection fine par GPU (detect-gpu) arrive en phase 8.
 */
export type Quality = "high" | "medium" | "off";

/** Clés de stockage : forçage pour les tests, rétrogradation mémorisée pour la session. */
export const QUALITY_KEYS = {
  force: "monbronze:forcer-webgl",
  degraded: "monbronze:webgl-degrade",
} as const;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "off";
  const forced = readStorage(QUALITY_KEYS.force) === "1";
  if (!forced && readStorage(QUALITY_KEYS.degraded, "session") === "1") return "off";
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement("canvas").getContext("webgl2");
  } catch {
    gl = null;
  }
  if (!gl) return "off";
  // Le fluide a besoin de cibles de rendu demi-flottantes.
  const halfFloat =
    gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float");
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  if (!halfFloat) return "off";
  if (SOFTWARE.test(renderer) && !forced) return "off";

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!forced && (memory <= 2 || cores <= 2)) return "off";
  if (coarse || memory <= 4 || cores <= 4) return "medium";
  return "high";
}

/** Mémorise pour la session qu'il faut rester en version statique (images trop lentes). */
export function markDegraded() {
  writeStorage(QUALITY_KEYS.degraded, "1", "session");
}

export function maxDpr(quality: Quality) {
  return quality === "high" ? 2 : 1.25;
}
