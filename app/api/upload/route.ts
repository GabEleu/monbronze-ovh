import { NextResponse } from "next/server";
import { z } from "zod";
import { extensionOf, UPLOAD } from "@/lib/contact-schema";
import { newObjectKey, presign, storageConfig } from "@/lib/object-storage";
import { clientIp, overBudget, tooMany } from "@/lib/rate-limit";

/**
 * Adresse d'envoi signée, navigateur → stockage privé compatible S3 (OVHcloud Object
 * Storage, BRIEF.md §7) : les fichiers ne passent pas par le serveur du site. Sans
 * configuration S3 : 501, le formulaire passe en mode simulé.
 * Protections : extensions autorisées, type de contenu choisi par le serveur (liste
 * explicite, pas de SVG ni de HTML), taille signée (le stockage refuse un fichier d'une
 * autre taille), adresse valable 15 minutes, clé imprévisible, 20 adresses par IP (ou
 * préfixe IPv6 /64) et par 10 minutes, et des plafonds de volume : par IP et pour tout le
 * site (un seul processus sur le VPS : plafonds exacts), pour que la facture de stockage
 * ne puisse pas s'emballer. Une demande complète = 10 fichiers × 50 Mo au plus.
 */
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const GB = 1024 ** 3;
const PER_IP_PER_DAY = 1 * GB;
const SITE_PER_HOUR = { count: 200, bytes: 2 * GB };
const SITE_PER_DAY = 10 * GB;
const CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "model/stl",
  "model/obj",
  "model/gltf-binary",
  "model/gltf+json",
  "model/3mf",
];

const requestSchema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive().max(UPLOAD.maxBytes),
  type: z.string().max(100),
});

export async function POST(request: Request) {
  const config = storageConfig();
  if (!config) {
    return NextResponse.json({ error: "Envoi de fichiers non configuré." }, { status: 501 });
  }
  if (tooMany(`upload:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop d'envois rapprochés." }, { status: 429 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Envoi refusé." }, { status: 400 });
  }
  const { name, size, type } = parsed.data;
  if (!(UPLOAD.extensions as readonly string[]).includes(extensionOf(name))) {
    return NextResponse.json({ error: "Format non accepté." }, { status: 400 });
  }
  const ip = clientIp(request);
  if (
    tooMany("upload:site", SITE_PER_HOUR.count, HOUR) ||
    overBudget(`upload-bytes:${ip}`, size, PER_IP_PER_DAY, DAY) ||
    overBudget("upload-bytes:site:hour", size, SITE_PER_HOUR.bytes, HOUR) ||
    overBudget("upload-bytes:site:day", size, SITE_PER_DAY, DAY)
  ) {
    console.warn("[upload] plafond atteint", { ip, size });
    return NextResponse.json({ error: "Envoi momentanément indisponible." }, { status: 429 });
  }
  const contentType = CONTENT_TYPES.includes(type) ? type : "application/octet-stream";
  const key = newObjectKey(name);
  const url = presign(config, {
    method: "PUT",
    key,
    expires: 15 * 60,
    headers: { "content-type": contentType, "content-length": String(size) },
  });
  return NextResponse.json({ url, key, contentType });
}
