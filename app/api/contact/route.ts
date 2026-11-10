import { NextResponse } from "next/server";
import { contactSchema, type ContactData } from "@/lib/contact-schema";
import { CONTACT_EMAIL } from "@/content/site";
import { clientIp, tooMany } from "@/lib/rate-limit";
import { presign, storageConfig } from "@/lib/object-storage";

/**
 * Réception d'une demande de projet (BRIEF.md §7).
 * - validation zod (même schéma que le navigateur), champ piège, limite de fréquence ;
 * - Cloudflare Turnstile si TURNSTILE_SECRET_KEY est défini ;
 * - e-mails via l'API Resend si RESEND_API_KEY est défini : notification à la fonderie
 *   (avec des liens signés vers les fichiers, valables 7 jours) et confirmation au visiteur.
 * Sans clés : MODE SIMULÉ, aucun envoi, la demande est seulement journalisée.
 */

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Lien de téléchargement signé (7 jours), le conteneur restant privé. */
function fileLink(key: string) {
  const config = storageConfig();
  if (!config || !key) return null;
  return presign(config, {
    method: "GET",
    key,
    expires: 7 * 24 * 3600,
    query: { "response-content-disposition": "attachment" },
  });
}

function summary(d: ContactData) {
  const files = d.fichiers.length
    ? d.fichiers
        .map((f) => {
          const link = fileLink(f.key);
          return `<li>${escape(f.name)}${link ? ` : <a href="${escape(link)}">télécharger</a>` : " (non envoyé)"}</li>`;
        })
        .join("")
    : "<li>Aucune pièce jointe</li>";
  return `
    <p><strong>Point de départ :</strong> ${escape(d.source)}${d.patine ? ` · patine : ${escape(d.patine)}` : ""}</p>
    <p><strong>Univers :</strong> ${escape(d.univers || "non précisé")}</p>
    <p><strong>Demande :</strong><br>${escape(d.demande).replace(/\n/g, "<br>")}</p>
    <p><strong>Pièces jointes</strong> (liens valables 7 jours ; ensuite, dans l'espace client OVHcloud, Object Storage) :</p><ul>${files}</ul>
    <p><strong>Contact :</strong> ${escape(d.prenom)} ${escape(d.nom)} · ${escape(d.email)}${d.telephone ? ` · ${escape(d.telephone)}` : ""}</p>`;
}

async function verifyTurnstile(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // mode simulé
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const json = (await res.json().catch(() => ({}))) as { success?: boolean };
  return Boolean(json.success);
}

async function sendMail(to: string, subject: string, html: string, replyTo?: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo }),
  });
  if (!res.ok) throw new Error(`Resend : ${res.status}`);
  return true;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const json = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Certaines informations sont incomplètes ou invalides." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  // Champ piège rempli : on répond « reçu » sans rien faire (le robot n'apprend rien).
  if (data.site) return NextResponse.json({ ok: true, mode: "ignore" });
  // 3 envois par adresse IP et par 10 minutes.
  if (tooMany(`contact:${ip}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json(
      { ok: false, error: "Trop d'envois rapprochés. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }
  if (!(await verifyTurnstile(data.turnstile, ip))) {
    return NextResponse.json(
      { ok: false, error: "La vérification anti-spam a échoué. Réessayez." },
      { status: 400 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL || CONTACT_EMAIL;
  try {
    const sent = await sendMail(
      to,
      `Nouvelle demande de projet : ${data.prenom} ${data.nom}`,
      `<h1>Nouvelle demande de projet</h1>${summary(data)}`,
      data.email,
    );
    if (!sent) {
      console.info("[contact] MODE SIMULÉ (aucune clé Resend) : demande reçue", {
        ...data,
        demande: `${data.demande.slice(0, 80)}…`,
      });
      return NextResponse.json({ ok: true, mode: "simule" });
    }
    // Confirmation au visiteur : AUCUN texte saisi (pas même le prénom, où une adresse web
    // deviendrait un lien) : le formulaire ne doit pas servir à envoyer un message à une
    // adresse choisie par un tiers. Seulement si l'anti-spam est actif (sinon un robot
    // ferait envoyer des e-mails à n'importe qui depuis contact@).
    // Son échec ne fait pas échouer la demande, déjà transmise (pas de doublon).
    if (process.env.TURNSTILE_SECRET_KEY)
      try {
        await sendMail(
          data.email,
          "monbronze.fr : nous avons bien reçu votre demande",
          `<p>Bonjour,</p>
         <p>Merci : votre demande de projet en bronze nous est bien parvenue${
           data.fichiers.length ? ` (${data.fichiers.length} pièce(s) jointe(s))` : ""
         }. Chaque projet est étudié individuellement : nous revenons vers vous pour en discuter.</p>
         <p>L'équipe monbronze.fr · ${CONTACT_EMAIL}</p>`,
          to,
        );
      } catch (error) {
        console.error("[contact] confirmation non envoyée", error);
      }
    return NextResponse.json({ ok: true, mode: "envoye" });
  } catch (error) {
    console.error("[contact] échec d'envoi", error);
    return NextResponse.json(
      { ok: false, error: `L'envoi a échoué. Vous pouvez nous écrire à ${CONTACT_EMAIL}.` },
      { status: 502 },
    );
  }
}
