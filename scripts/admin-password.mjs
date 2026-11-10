#!/usr/bin/env node
/**
 * Crée les deux variables de l'espace d'administration (/admin) :
 *   node scripts/admin-password.mjs
 * Demande le mot de passe (deux fois, sans l'afficher), puis affiche les lignes à copier
 * dans /srv/monbronze/shared/.env.production (ou .env.local en développement) :
 *   ADMIN_PASSWORD_HASH=…   (empreinte scrypt : le mot de passe n'est stocké nulle part)
 *   ADMIN_SESSION_SECRET=…  (aléatoire ; le changer déconnecte tout le monde)
 * Puis : sudo systemctl restart monbronze.
 */
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";

function ask(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    const chars = [];
    const tty = stdin.isTTY;
    if (tty) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (data) => {
      for (const ch of data) {
        if (ch === "\r" || ch === "\n") {
          stdin.off("data", onData);
          if (tty) stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(chars.join(""));
          return;
        }
        if (ch === "\u0003") process.exit(1); // Ctrl+C
        if (ch === "\u007f" || ch === "\b") chars.pop();
        else chars.push(ch);
      }
    };
    stdin.on("data", onData);
  });
}

const password = await ask("Mot de passe de l'espace d'administration (12 caractères ou plus) : ");
if (password.length < 12) {
  console.error("Trop court : 12 caractères au moins (une phrase de quelques mots convient).");
  process.exit(1);
}
if ((await ask("Confirmer : ")) !== password) {
  console.error("Les deux saisies diffèrent.");
  process.exit(1);
}

const N = 2 ** 15;
const r = 8;
const p = 1;
const salt = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
  scrypt(password.normalize("NFC"), salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 }, (e, k) =>
    e ? reject(e) : resolve(k),
  ),
);

console.log("\nÀ copier dans .env.production (VPS) ou .env.local (développement) :\n");
// Séparateur « . » et base64url : ni « $ » ni guillemets (voir lib/admin/auth.ts).
console.log(
  `ADMIN_PASSWORD_HASH=scrypt.${N}.${r}.${p}.${salt.toString("base64url")}.${hash.toString("base64url")}`,
);
console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
