import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { adminJson, guard } from "@/lib/admin/auth";
import { mediaDir } from "@/lib/content/store";

/**
 * Envoi d'un média depuis l'espace d'administration (formulaire multipart) :
 * - image : réencodée en WebP (2 000 px au plus, orientation EXIF appliquée, métadonnées
 *   retirées) → /media/images/<uuid>.webp ;
 * - video : MP4 (signature « ftyp » vérifiée) + son affiche → /media/videos/<uuid>.mp4|.webp ;
 * - model : GLB déjà préparé dans le navigateur (lib/model-pipeline.mjs, signature « glTF »
 *   vérifiée) + son image fixe → /media/modeles/<uuid>.glb et /media/images/<uuid>.webp.
 * Noms de fichiers choisis par le serveur (jamais ceux de l'utilisateur).
 */
const MB = 1024 * 1024;
const LIMITS = { image: 30 * MB, video: 80 * MB, model: 6 * MB };

function mediaWritable() {
  return process.env.NODE_ENV !== "production" || Boolean(process.env.MEDIA_DIR);
}

async function save(folder: string, name: string, data: Buffer | Uint8Array) {
  const dir = path.join(mediaDir(), folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), data);
  return `/media/${folder}/${name}`;
}

async function saveImage(file: File, id: string, folder = "images") {
  if (file.size > LIMITS.image) throw new Error("Image trop lourde (30 Mo au plus).");
  const input = Buffer.from(await file.arrayBuffer());
  // 40 Mpx au plus (le navigateur réduit déjà les photos à 2 400 px) : pas de bombe mémoire.
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const src = await save(folder, `${id}.webp`, data);
  return { src, width: info.width, height: info.height };
}

/** GLB autonome : aucune ressource externe (sinon chaque visiteur la téléchargerait). */
function glbIsSelfContained(buf: Buffer) {
  if (buf.length < 20 || buf.toString("latin1", 16, 20) !== "JSON") return false;
  const length = buf.readUInt32LE(12);
  try {
    const json = JSON.parse(buf.toString("utf8", 20, 20 + length)) as {
      buffers?: { uri?: unknown }[];
      images?: { uri?: unknown }[];
    };
    return ![...(json.buffers ?? []), ...(json.images ?? [])].some((x) => x?.uri !== undefined);
  } catch {
    return false;
  }
}

const signature = async (file: File, start: number, end: number) =>
  Buffer.from(await file.slice(start, end).arrayBuffer()).toString("latin1");

export async function POST(request: Request) {
  const denied = guard(request, { mutation: true });
  if (denied) return denied;
  if (!mediaWritable())
    return adminJson({ error: "MEDIA_DIR n'est pas défini sur le serveur." }, 500);

  // Taille annoncée vérifiée AVANT de lire le corps (Nginx plafonne aussi à 100 Mo).
  if (Number(request.headers.get("content-length") ?? 0) > 100 * MB) {
    return adminJson({ error: "Fichier trop lourd." }, 413);
  }
  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  const file = form?.get("file");
  if (!form || !(file instanceof File) || file.size === 0) {
    return adminJson({ error: "Fichier manquant." }, 400);
  }
  const id = randomUUID();
  try {
    if (kind === "image") {
      return adminJson(await saveImage(file, id), 200);
    }
    if (kind === "video") {
      if (file.size > LIMITS.video)
        return adminJson({ error: "Vidéo trop lourde (80 Mo au plus)." }, 400);
      if ((await signature(file, 4, 8)) !== "ftyp") {
        return adminJson({ error: "Vidéo MP4 attendue." }, 400);
      }
      const poster = form.get("poster");
      if (!(poster instanceof File)) return adminJson({ error: "Affiche manquante." }, 400);
      const src = await save("videos", `${id}.mp4`, Buffer.from(await file.arrayBuffer()));
      const image = await saveImage(poster, id, "videos");
      return adminJson({ src, poster: image.src }, 200);
    }
    if (kind === "model") {
      if (file.size > LIMITS.model)
        return adminJson({ error: "Modèle trop lourd (6 Mo au plus)." }, 400);
      const head = Buffer.from(await file.slice(0, 8).arrayBuffer());
      if (head.toString("latin1", 0, 4) !== "glTF" || head.readUInt32LE(4) !== 2) {
        return adminJson({ error: "Modèle GLB attendu." }, 400);
      }
      const still = form.get("image");
      if (!(still instanceof File)) return adminJson({ error: "Image du modèle manquante." }, 400);
      const glb = Buffer.from(await file.arrayBuffer());
      if (!glbIsSelfContained(glb)) {
        return adminJson({ error: "Modèle GLB autonome attendu (sans fichier externe)." }, 400);
      }
      const src = await save("modeles", `${id}.glb`, glb);
      const image = await saveImage(still, id);
      return adminJson({ src, image }, 200);
    }
    return adminJson({ error: "Type de média inconnu." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[admin] média refusé", error);
    return adminJson(
      {
        error: message.includes("Mo") ? message : "Fichier illisible ou format non pris en charge.",
      },
      400,
    );
  }
}
