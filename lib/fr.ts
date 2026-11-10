/**
 * Typographie française : insère les espaces insécables là où l'usage les impose.
 * Les textes de `content/` sont écrits avec des espaces normales ; `fr()` les corrige.
 *
 * - apostrophe typographique (’)
 * - espace fine insécable (U+202F) avant ; ! ? et à l'intérieur des guillemets « »
 * - espace insécable (U+00A0) avant : (usage de l'Imprimerie nationale)
 * - espace fine insécable entre les groupes de milliers (1 200)
 * - espace insécable entre un nombre et son unité (20 °C, 50 Mo, 3 s)
 */
const NNBSP = " ";
const NBSP = " ";

export function frTypo(input: string): string {
  return (
    input
      // apostrophe typographique
      .replace(/'/g, "’")
      // espaces avant ; ! ? (sauf dans une URL ou un nombre décimal)
      .replace(/ ([;!?])/g, `${NNBSP}$1`)
      .replace(/ :(?=\s|$)/g, `${NBSP}:`)
      // guillemets français
      .replace(/« /g, `«${NNBSP}`)
      .replace(/ »/g, `${NNBSP}»`)
      // milliers : 1 200, 12 000
      .replace(/(\d) (\d{3})(?!\d)/g, `$1${NNBSP}$2`)
      // nombre + unité
      .replace(/(\d) (°C|%|Mo|Go|Ko|mm|cm|m|s|h)(?![\p{L}])/gu, `$1${NBSP}$2`)
      // « environ 1 200 °C » : signe ≈ collé au nombre
      .replace(/≈ (\d)/g, `≈${NNBSP}$1`)
  );
}

// Les types littéraux (identifiants, slugs) sont conservés : ils ne sont jamais transformés.
type DeepFr<T> = T extends string
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepFr<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepFr<T[K]> }
      : T;

/** Applique `frTypo` à toutes les chaînes d'un objet de contenu (récursif). */
export function fr<T>(content: T): DeepFr<T> {
  const walk = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") {
      // Ne jamais toucher aux liens, chemins et identifiants.
      if (key && /^(href|url|slug|id|src|email|mailto|tel)$/i.test(key)) return value;
      return frTypo(value);
    }
    if (Array.isArray(value)) return value.map((v) => walk(v));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v, k)]));
    }
    return value;
  };
  return walk(content) as DeepFr<T>;
}
