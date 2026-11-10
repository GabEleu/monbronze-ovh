#!/usr/bin/env node
/**
 * Prépare un scan 3D pour le web (BRIEF.md §5.1).
 *
 *   node scripts/prepare-model.mjs <entrée> <sortie.glb> [options]
 *   node scripts/prepare-model.mjs --demo public/models/demo-noeud.glb
 *
 * Entrées : .obj, .stl, .ply, .glb, .gltf (les textures du scan sont ignorées :
 * la sculpture est re-rendue en bronze, seule la géométrie compte).
 *
 * Étapes (lib/model-pipeline.mjs, partagé avec l'espace d'administration) : fusion des
 * maillages → soudure des sommets → orientation → normalisation (hauteur 1, centrée) →
 * simplification (meshoptimizer) → normales lisses → cuisson des creux (attribut _CAVITY :
 * occlusion ambiante + concavité) → quantification + compression Meshopt → GLB.
 *
 * Options :
 *   --triangles <n>   nombre de triangles visé (défaut 160000)
 *   --rotate-x <deg>  rotation autour de X (scans « Z en haut » : -90)
 *   --rotate-y <deg>  rotation autour de Y (orienter le visage vers +Z)
 *   --rotate-z <deg>  rotation autour de Z
 *   --rays <n>        rayons d'occlusion par sommet (défaut 48)
 *   --radius <r>      rayon d'occlusion, en fraction de la diagonale (défaut 0.1)
 *   --keep-lowest <f> supprime le socle : garde y > minY + f × hauteur (défaut 0)
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import {
  DEFAULTS,
  demoGeometry,
  geometriesFromGltf,
  geometriesFromMesh,
  mergePositions,
  prepareModel,
} from "../lib/model-pipeline.mjs";

// ───────────────────────────── arguments ─────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(argv[i + 1]);
};
const demo = argv.includes("--demo");
const BOOLEAN_FLAGS = new Set(["--demo"]);
const positional = argv.filter(
  (a, i) =>
    !a.startsWith("--") && !(argv[i - 1]?.startsWith("--") && !BOOLEAN_FLAGS.has(argv[i - 1])),
);
const [input, output] = demo ? [null, positional[0]] : positional;
if (!output || (!demo && !input)) {
  console.error(
    "Usage : node scripts/prepare-model.mjs <entrée> <sortie.glb> [options] | --demo <sortie.glb>",
  );
  process.exit(1);
}
const opts = {
  triangles: flag("triangles", DEFAULTS.triangles),
  rotateX: flag("rotate-x", DEFAULTS.rotateX),
  rotateY: flag("rotate-y", DEFAULTS.rotateY),
  rotateZ: flag("rotate-z", DEFAULTS.rotateZ),
  rays: flag("rays", DEFAULTS.rays),
  radius: flag("radius", DEFAULTS.radius),
  keepLowest: flag("keep-lowest", DEFAULTS.keepLowest),
};

const t0 = performance.now();
const log = (msg) => console.log(`[${((performance.now() - t0) / 1000).toFixed(1)} s] ${msg}`);

// ───────────────────────────── lecture ─────────────────────────────
async function loadGeometry(file) {
  const ext = path.extname(file).toLowerCase().slice(1);
  if (ext === "glb" || ext === "gltf") {
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      "meshopt.decoder": MeshoptDecoder,
    });
    try {
      const draco3d = await import("draco3dgltf");
      io.registerDependencies({ "draco3d.decoder": await draco3d.default.createDecoderModule() });
    } catch {
      /* draco3dgltf absent : les fichiers Draco ne seront pas lisibles */
    }
    return mergePositions(geometriesFromGltf(await io.read(file)));
  }
  const buf = await readFile(file);
  const data =
    ext === "obj"
      ? buf.toString("utf8")
      : buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return mergePositions(geometriesFromMesh(ext, data));
}

// ───────────────────────────── pipeline ─────────────────────────────
const raw = demo ? demoGeometry() : await loadGeometry(input);
const { doc, triangles } = await prepareModel(raw, opts, log);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder,
});
await io.write(output, doc);
const { size } = await stat(output);
log(`écrit : ${output} · ${triangles} triangles · ${(size / 1024).toFixed(0)} Ko`);
if (size > 3 * 1024 * 1024) {
  console.error("⚠ Plus de 3 Mo : réduire --triangles.");
  process.exitCode = 1;
}
