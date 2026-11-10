import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { mediaDir } from "@/lib/content/store";

/**
 * Médias envoyés depuis l'espace d'administration (/media/…). En production, Nginx les sert
 * directement depuis MEDIA_DIR (deploy/nginx) ; cette route sert le développement, les tests
 * et un serveur sans Nginx. Noms produits par le serveur uniquement (uuid) : rien d'autre
 * n'est lisible. Prise en charge des plages d'octets (lecture vidéo sur iPhone).
 */
const TYPES: Record<string, string> = {
  webp: "image/webp",
  mp4: "video/mp4",
  glb: "model/gltf-binary",
};
const NAME = /^(images|videos|modeles)\/[0-9a-f-]{36}\.(webp|mp4|glb)$/;

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = (await params).path.join("/");
  if (!NAME.test(rel)) return new Response("Introuvable", { status: 404 });
  const file = path.join(mediaDir(), rel);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return new Response("Introuvable", { status: 404 });

  const headers = new Headers({
    "Content-Type": TYPES[rel.split(".").pop()!]!,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  });
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = info.size;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers });
}
