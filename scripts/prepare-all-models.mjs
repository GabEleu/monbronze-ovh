#!/usr/bin/env node
/**
 * Régénère tous les modèles web depuis les originaux de raw/ (ignorés par git).
 * Source unique des réglages exacts de chaque modèle : modifier ici, puis
 *   npm run models
 * Les originaux se retéléchargent depuis les URL notées (accord de l'utilisateur obtenu
 * en phase 1 ; tout NOUVEAU fichier demande un nouvel accord).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const MODELS = [
  {
    out: "public/models/buste-romain.glb",
    raw: "raw/kas1100-buste/kas1100_small.stl",
    url: "https://api.smk.dk/api/v1/download-3d/cn69m905w_KAS1100_small.stl",
    args: ["--triangles", "240000", "--rotate-x", "-90"],
  },
  {
    // Même scan, très allégé : maillage filaire lisible de la métamorphose (étape 2).
    out: "public/models/buste-romain-filaire.glb",
    raw: "raw/kas1100-buste/kas1100_small.stl",
    url: "https://api.smk.dk/api/v1/download-3d/cn69m905w_KAS1100_small.stl",
    args: ["--triangles", "9000", "--rotate-x", "-90"],
  },
  {
    out: "public/models/tete-de-cheval.glb",
    raw: "raw/kas1133-cheval/kas1133-2_small.stl",
    url: "https://api.smk.dk/api/v1/download-3d/05741x17j_KAS1133-2_small.stl",
    args: ["--triangles", "120000", "--rotate-x", "-90"],
  },
  {
    out: "public/models/relief-couple.glb",
    raw: "raw/dep457-couple/dep457_small.stl",
    url: "https://api.smk.dk/api/v1/download-3d/4j03d432t_DEP457_small.stl",
    args: ["--triangles", "120000"],
  },
  {
    out: "public/models/prince-hellenistique.glb",
    raw: "raw/kas823-monumental/kas823_small.stl",
    url: "https://api.smk.dk/api/v1/download-3d/v118rk27v_KAS823_small.stl",
    args: ["--triangles", "120000", "--rotate-x", "-90"],
  },
  {
    out: "public/models/patineuse.glb",
    raw: "raw/saam-girl-skating/girl_skating_draco.glb",
    url: "https://3d-api.si.edu/content/document/3d_package:e8d1f790-28a8-492d-84f5-cf2817f8cdcf/resources/saam_2011_29-girl_skating-polish-100k-2048_std_draco.glb",
    args: ["--triangles", "120000"],
  },
  {
    out: "public/models/brule-parfum.glb",
    raw: "raw/nmaa-boshanlu/boshanlu-150k.glb",
    url: "https://3d-api.si.edu/content/document/3d_package:ce850625-2cf1-4c6f-9086-0d5845d9a664/resources/incense-burner-in-the-form-of-a-mountain-%28boshanlu%29-150k-4096.glb",
    args: ["--triangles", "120000"],
  },
  { out: "public/models/demo-noeud.glb", demo: true, args: ["--triangles", "120000"] },
];

let failed = false;
for (const m of MODELS) {
  if (!m.demo && !existsSync(m.raw)) {
    console.error(`✗ ${m.raw} absent. Télécharger depuis : ${m.url}`);
    failed = true;
    continue;
  }
  const args = ["scripts/prepare-model.mjs", ...(m.demo ? ["--demo"] : [m.raw]), m.out, ...m.args];
  console.log(`→ ${m.out}`);
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
