/**
 * Mise en page du titre pour la coulée (BRIEF.md §3.3), SANS three.js : le creuset
 * (DOM, chargé avant le moteur 3D) s'en sert pour se placer au-dessus du point d'impact.
 *
 * Le masque est construit à partir de la mise en page RÉELLE du <h1> : chaque mot est
 * mesuré dans le DOM (Range.getClientRects) puis redessiné dans un canvas 2D avec la même
 * police, calé sur la largeur mesurée. Canal rouge : couverture des lettres ; canal vert :
 * abscisse du centre de chaque glyphe (× couverture). Ce masque n'est pas un vrai SDF : ses
 * mips floutés servent au halo et au chanfrein.
 *
 * Coordonnées : uv du rectangle de la section d'accueil (y vers le haut).
 */
export type TitleLine = { top: number; bottom: number; left: number; right: number };

export type TitleLayout = {
  canvas: HTMLCanvasElement;
  /** Lignes du titre, de haut en bas. */
  lines: TitleLine[];
  /** Point d'impact de la coulée (uv) : un jambage de la DERNIÈRE ligne. */
  pourX: number;
  /** Empreinte de la mise en page (redimensionnement, polices, espacement du texte). */
  signature: string;
};

/** Plafond de pixels du masque (≈ 16 Mo avec ses mips). */
const MAX_PIXELS = 4_000_000;

/** Empreinte bon marché de la mise en page du titre, relative à la section. */
export function titleSignature(title: HTMLElement, hero: HTMLElement) {
  const h = hero.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(title);
  const rects = Array.from(range.getClientRects())
    .map(
      (r) =>
        `${Math.round(r.left - h.left)},${Math.round(r.top - h.top)},${Math.round(r.width)},${Math.round(r.height)}`,
    )
    .join(";");
  return `${Math.round(h.width)}x${Math.round(h.height)}|${rects}|${title.textContent ?? ""}`;
}

export function drawTitleLayout(title: HTMLElement, hero: HTMLElement): TitleLayout | null {
  const heroRect = hero.getBoundingClientRect();
  if (heroRect.width < 1 || heroRect.height < 1) return null;
  // Netteté de l'écran (jusqu'à ×2), dans la limite de MAX_PIXELS.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.max(
    0.5,
    Math.min(dpr, Math.sqrt(MAX_PIXELS / (heroRect.width * heroRect.height))),
  );
  const width = Math.max(64, Math.round(heroRect.width * scale));
  const height = Math.max(64, Math.round(heroRect.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const style = getComputedStyle(title);
  const fontSize = parseFloat(style.fontSize) * scale;
  ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const letterSpacing = parseFloat(style.letterSpacing);
  if ("letterSpacing" in ctx && Number.isFinite(letterSpacing)) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${letterSpacing * scale}px`;
  }
  ctx.textBaseline = "alphabetic";
  const upper = style.textTransform === "uppercase";
  const metrics = ctx.measureText("H");
  const ascent = Number.isFinite(metrics.fontBoundingBoxAscent)
    ? metrics.fontBoundingBoxAscent
    : fontSize * 0.9;
  const capHeight = Number.isFinite(metrics.actualBoundingBoxAscent)
    ? metrics.actualBoundingBoxAscent
    : fontSize * 0.7;

  type Word = { rect: DOMRect; baseline: number };
  const words: Word[] = [];
  const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const re = /\S+/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const word = upper ? m[0].toLocaleUpperCase("fr") : m[0];
      for (const r of Array.from(range.getClientRects())) {
        if (r.width < 0.5) continue;
        const x = (r.left - heroRect.left) * scale;
        const y = (r.top - heroRect.top) * scale + ascent;
        // Le canvas 2D ne reproduit pas tous les axes variables (taille optique) : on cale
        // chaque mot sur la largeur RÉELLE mesurée dans la page.
        const measured = ctx.measureText(word).width || 1;
        const sx = (r.width * scale) / measured;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sx, 1);
        // Lettre par lettre : le canal vert porte l'abscisse du CENTRE de chaque glyphe,
        // pour que le métal monte à niveau horizontal dans chaque lettre (vert / rouge).
        const chars = Array.from(word);
        let offset = 0;
        for (let i = 0; i < chars.length; i++) {
          const next = ctx.measureText(chars.slice(0, i + 1).join("")).width;
          const center = (x + ((offset + next) / 2) * sx) / width;
          ctx.fillStyle = `rgb(255,${Math.round(Math.min(1, Math.max(0, center)) * 255)},0)`;
          ctx.fillText(chars[i]!, offset, 0);
          offset = next;
        }
        ctx.restore();
        words.push({ rect: r, baseline: y });
      }
    }
  }
  if (!words.length) return null;

  // Regroupe les mots par ligne (même ordonnée).
  const lines: (TitleLine & { baseline: number })[] = [];
  for (const { rect: r, baseline } of words.sort((a, b) => a.rect.top - b.rect.top)) {
    const last = lines[lines.length - 1];
    const top = 1 - (r.top - heroRect.top) / heroRect.height;
    const bottom = 1 - (r.bottom - heroRect.top) / heroRect.height;
    const left = (r.left - heroRect.left) / heroRect.width;
    const right = (r.right - heroRect.left) / heroRect.width;
    if (last && Math.abs(last.top - top) < 0.01) {
      last.left = Math.min(last.left, left);
      last.right = Math.max(last.right, right);
    } else {
      lines.push({ top, bottom, left, right, baseline });
    }
  }

  // Point d'impact : le jambage de la dernière ligne le plus proche de 42 % de sa largeur
  // (le filet doit tomber DANS une lettre, pas entre deux).
  const last = lines[lines.length - 1]!;
  const target = (last.left + (last.right - last.left) * 0.42) * width;
  const row = Math.round(Math.min(height - 1, Math.max(0, last.baseline - capHeight * 0.3)));
  const data = ctx.getImageData(0, row, width, 1).data;
  let best = target;
  let bestDistance = Infinity;
  const from = Math.max(0, Math.floor(last.left * width));
  const to = Math.min(width, Math.ceil(last.right * width));
  for (let x = from; x < to; x++) {
    if ((data[x * 4] ?? 0) < 128) continue;
    let end = x;
    while (end + 1 < to && (data[(end + 1) * 4] ?? 0) >= 128) end++;
    const center = (x + end) / 2;
    if (end - x >= 2 && Math.abs(center - target) < bestDistance) {
      bestDistance = Math.abs(center - target);
      best = center;
    }
    x = end;
  }

  return {
    canvas,
    lines: lines.slice(0, 6).map(({ top, bottom, left, right }) => ({ top, bottom, left, right })),
    pourX: best / width,
    signature: titleSignature(title, hero),
  };
}
