/**
 * Appels de l'espace d'administration (navigateur) vers /api/admin/*. Le navigateur envoie
 * lui-même le cookie de session et l'en-tête Origin.
 */
export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

export async function adminApi<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers:
      body instanceof FormData || body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  if (!res.ok) throw new AdminError(json.error ?? `Erreur ${res.status}`, res.status, json.details);
  return json as T;
}

/**
 * Réduit une photo dans le navigateur avant l'envoi (moins long, et lit le HEIC des iPhone
 * là où le navigateur sait l'afficher). Renvoie un JPEG de 2 400 px au plus.
 */
export async function shrinkImage(file: File, max = 2400): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.9),
    );
  } catch {
    // Format que le navigateur ne sait pas lire : le serveur tentera lui-même.
    return file;
  }
}

/** Image fixe d'une vidéo (vers la première seconde), pour son affiche. */
export async function videoPoster(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Vidéo illisible par ce navigateur."));
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const scale = Math.min(1, 1600 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.88),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Adresse lisible à partir d'un titre (« Fidèle à 20 ans » → « fidele-a-20-ans »). */
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
