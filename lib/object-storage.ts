import { createHash, createHmac, randomUUID } from "node:crypto";
export { OBJECT_KEY } from "@/lib/contact-schema";

/**
 * Stockage des pièces jointes du formulaire dans un conteneur PRIVÉ compatible S3
 * (OVHcloud Object Storage, BRIEF.md §7). Aucune dépendance : les adresses signées
 * (AWS Signature Version 4, « presigned URL ») sont calculées ici.
 *
 * - Envoi : le serveur signe une adresse PUT valable 15 minutes, liée au type et à la
 *   taille annoncés ; le navigateur envoie le fichier directement au stockage (rien ne
 *   transite par le serveur du site).
 * - Lecture : la notification à la fonderie contient des liens GET signés, valables
 *   7 jours (maximum de la signature V4). Le conteneur n'est jamais public.
 *
 * Variables : S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 * S3_PATH_STYLE (facultatif, « 1 » = adresse https://hôte/conteneur/clé).
 */

export type StorageConfig = {
  endpoint: URL;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathStyle: boolean;
};

export function storageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig | null {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_ENDPOINT || !S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    return null;
  }
  return {
    endpoint: new URL(S3_ENDPOINT),
    region: S3_REGION,
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    pathStyle: env.S3_PATH_STYLE === "1",
  };
}

/** Encodage RFC 3986 exigé par la signature V4 (encodeURIComponent laisse passer !'()*). */
const rfc3986 = (s: string) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key: Buffer | string, s: string) =>
  createHmac("sha256", key).update(s, "utf8").digest();

type PresignOptions = {
  method: "GET" | "PUT" | "HEAD";
  key: string;
  /** Durée de validité en secondes (1 à 604 800). */
  expires: number;
  /** En-têtes que la requête devra porter à l'identique (ex. content-type). */
  headers?: Record<string, string>;
  /** Paramètres supplémentaires signés (ex. response-content-disposition). */
  query?: Record<string, string>;
  now?: Date;
};

export function presign(config: StorageConfig, options: PresignOptions): string {
  const { method, key, expires, headers = {}, query = {}, now = new Date() } = options;
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const base = config.endpoint.host;
  const host = config.pathStyle ? base : `${config.bucket}.${base}`;
  const encodedKey = key.split("/").map(rfc3986).join("/");
  const path = config.pathStyle ? `/${rfc3986(config.bucket)}/${encodedKey}` : `/${encodedKey}`;

  const allHeaders: Record<string, string> = { host };
  for (const [name, value] of Object.entries(headers)) {
    allHeaders[name.toLowerCase()] = value.trim();
  }
  const headerNames = Object.keys(allHeaders).sort();
  const signedHeaders = headerNames.join(";");
  const canonicalHeaders = headerNames.map((n) => `${n}:${allHeaders[n]}\n`).join("");

  const params: Record<string, string> = {
    ...query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.max(1, Math.min(604800, Math.floor(expires)))),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k]!)}`)
    .join("&");

  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return `${config.endpoint.protocol}//${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Nom de fichier sûr (ASCII, sans chemin), extension conservée. */
export function safeFileName(name: string) {
  const clean = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(-120);
  return clean || "fichier";
}

/** Clé d'objet imprévisible : demandes/AAAA-MM/<uuid>/<nom>. */
export function newObjectKey(name: string, now = new Date()) {
  const month = now.toISOString().slice(0, 7);
  return `demandes/${month}/${randomUUID()}/${safeFileName(name)}`;
}
