#!/usr/bin/env node
/**
 * Photos réelles de l'atelier (Fonderie ArtCulture), fournies par l'utilisateur le
 * 2026-11-08 dans OneDrive_1_08-11-2026/ (ignoré par git).
 *
 * Autorisation écrite de la fonderie obtenue (confirmée par l'utilisateur le 2026-11-09) :
 * les fichiers produits vont dans public/atelier/ (suivi par git, donc déployé) et sont
 * crédités sur /credits. Les noms d'origine citent des artistes : on renomme par geste,
 * sans nom d'artiste ni de client (décision de l'utilisateur).
 *
 * Traitement unifié (BRIEF.md §5.3) : désaturation, ombres charbon, demi-teintes bronze.
 *   node scripts/prepare-atelier-media.mjs
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "OneDrive_1_08-11-2026";
const OUT = "public/atelier";

/**
 * Geste → photo source : table dans raw/atelier-mapping.json (IGNORÉ PAR GIT), car les noms
 * des fichiers d'origine citent des artistes et des clients, qui ne doivent pas entrer dans
 * l'historique du dépôt.
 */
const MAPPING = "raw/atelier-mapping.json";

if (!existsSync(SRC)) {
  console.log(`Dossier ${SRC}/ absent : rien à préparer (le site garde ses visuels provisoires).`);
  process.exit(0);
}
if (!existsSync(MAPPING)) {
  console.log(`Table ${MAPPING} absente : rien à préparer.`);
  process.exit(0);
}
const MEDIA = JSON.parse(readFileSync(MAPPING, "utf8"));
mkdirSync(OUT, { recursive: true });

for (const [name, file] of Object.entries(MEDIA)) {
  if (typeof file !== "string") continue;
  const base = sharp(`${SRC}/${file}`)
    .rotate()
    .resize({ width: 1600, height: 1200, fit: "cover", position: "attention" })
    // Désaturation, contraste doux, virage chaud (charbon → bronze).
    .modulate({ saturation: 0.62, brightness: 0.94 })
    .linear(1.06, -6)
    .recomb([
      [1.05, 0.05, 0.0],
      [0.02, 0.97, 0.01],
      [0.0, 0.04, 0.86],
    ]);
  await base.clone().webp({ quality: 74, effort: 6 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name} ← ${file}`);
}

// Vidéos (BRIEF.md §5.3) : extraits courts, 1280 × 720, H.264 sans son (lecture automatique
// muette autorisée), démarrage rapide (faststart), plus une affiche (première image) en WebP.
import { spawnSync } from "node:child_process";
for (const [name, v] of Object.entries(MEDIA.videos ?? {})) {
  const src = `${SRC}/${v.file}`;
  const out = `${OUT}/${name}.mp4`;
  const grade = "eq=saturation=0.72:contrast=1.04,colorbalance=rs=0.04:bs=-0.05";
  const run = spawnSync(
    "ffmpeg",
    [
      "-y", "-v", "error", "-ss", String(v.start), "-t", String(v.duration), "-i", src,
      "-vf", `scale=1280:-2,${grade}`, "-an", "-c:v", "libx264", "-preset", "slow",
      "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
    ],
    { stdio: "inherit" },
  );
  if (run.status !== 0) throw new Error(`ffmpeg a échoué pour ${name}`);
  spawnSync("ffmpeg", ["-y", "-v", "error", "-i", out, "-frames:v", "1", `${OUT}/${name}.png`], { stdio: "inherit" });
  await sharp(`${OUT}/${name}.png`).webp({ quality: 74 }).toFile(`${OUT}/${name}.webp`);
  console.log(`${name} ← ${v.file}`);
}
