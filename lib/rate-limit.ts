/**
 * Limite de fréquence simple, en mémoire (par instance serveur) : protège le formulaire et
 * la délivrance des adresses d'envoi de fichiers contre les rafales. Sur un VPS (un seul
 * processus), elle est exacte ; sur une plateforme à plusieurs instances, c'est une
 * protection d'appoint, en plus de Turnstile. Derrière Nginx, l'IP vient de X-Real-IP,
 * que Nginx réécrit toujours (deploy/nginx) : un visiteur ne peut pas la falsifier.
 */
const buckets = new Map<string, number[]>();
const budgets = new Map<string, { at: number; amount: number }[]>();
let lastSweep = 0;

/** Développe une adresse IPv6 abrégée (« :: ») en huit groupes. */
function expandIpv6(ip: string) {
  const [head = "", tail = ""] = ip.split("::");
  const a = head ? head.split(":") : [];
  const b = ip.includes("::") && tail ? tail.split(":") : [];
  const fill = ip.includes("::") ? Array(Math.max(0, 8 - a.length - b.length)).fill("0") : [];
  return [...a, ...fill, ...b];
}

/**
 * Adresse du visiteur. En IPv6, on retient le préfixe /64 : un hôte en dispose de milliards
 * d'adresses et pourrait sinon en changer à chaque requête pour contourner les limites.
 */
export function clientIp(request: Request) {
  const ip =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "inconnue";
  if (!ip.includes(":") || ip.startsWith("::ffff:")) return ip;
  return `${expandIpv6(ip).slice(0, 4).join(":")}::/64`;
}

/** Purge des entrées anciennes, au plus une fois par minute (pas à chaque appel). */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  const day = 24 * 3600 * 1000;
  for (const [k, v] of buckets) if (v.every((t) => now - t >= day)) buckets.delete(k);
  for (const [k, v] of budgets) if (v.every((e) => now - e.at >= day)) budgets.delete(k);
}

/** Vrai si `key` a dépassé `max` appels sur la fenêtre `windowMs` (fenêtre ≤ 24 h). */
export function tooMany(key: string, max: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  return recent.length > max;
}

/** Nombre d'événements enregistrés pour `key` sur la fenêtre, sans en ajouter. */
export function recentCount(key: string, windowMs: number) {
  const now = Date.now();
  return (buckets.get(key) ?? []).filter((t) => now - t < windowMs).length;
}

/**
 * Budget global : vrai si ajouter `amount` dépasserait `max` sur la fenêtre (rien n'est
 * alors compté). Sert à plafonner le volume total de fichiers acceptés, toutes IP confondues.
 */
export function overBudget(key: string, amount: number, max: number, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const recent = (budgets.get(key) ?? []).filter((e) => now - e.at < windowMs);
  const used = recent.reduce((sum, e) => sum + e.amount, 0);
  if (used + amount > max) {
    budgets.set(key, recent);
    return true;
  }
  recent.push({ at: now, amount });
  budgets.set(key, recent);
  return false;
}
