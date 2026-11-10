/**
 * Préparation d'un scan 3D pour le site (BRIEF.md §5.1), commune au script
 * `scripts/prepare-model.mjs` (Node) et à l'espace d'administration (navigateur) :
 * soudure → orientation → normalisation (hauteur 1, centrée) → socle facultatif →
 * simplification (meshoptimizer) → normales lisses → cuisson des creux (_CAVITY : occlusion
 * ambiante + concavité) et des crêtes (_CONVEX) → document glTF compressé (Meshopt).
 *
 * Aucun accès disque ici : la lecture et l'écriture du fichier restent à l'appelant
 * (NodeIO dans le script, WebIO dans le navigateur). JavaScript simple (pas de TypeScript)
 * pour être importé tel quel par Node.
 */
import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshBVH } from "three-mesh-bvh";
import { Document } from "@gltf-transform/core";
import { meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

/** Réglages par défaut (identiques au script historique). */
export const DEFAULTS = {
  triangles: 160000,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  rays: 48,
  radius: 0.1,
  keepLowest: 0,
};

/** Formats acceptés (extension en minuscules, sans point). */
export const MODEL_EXTENSIONS = ["glb", "gltf", "obj", "stl", "ply"];

// ───────────────────────────── lecture ─────────────────────────────

/** Géométries d'un document glTF déjà lu (NodeIO ou WebIO), triangles uniquement. */
export function geometriesFromGltf(doc) {
  const geometries = [];
  const el = [0, 0, 0];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // TRIANGLES uniquement
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const count = pos.getCount();
      const arr = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos.getElement(i, el);
        arr.set(el, i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const idx = prim.getIndices();
      if (idx) g.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx.getArray()), 1));
      g.applyMatrix4(matrix);
      geometries.push(g.index ? g.toNonIndexed() : g);
    }
  }
  return geometries;
}

/**
 * Géométries d'un fichier OBJ, STL ou PLY (contenu brut). Les glTF passent par
 * geometriesFromGltf (lecture avec NodeIO ou WebIO selon l'environnement).
 */
export function geometriesFromMesh(ext, data) {
  if (ext === "obj") {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    const group = new OBJLoader().parse(text);
    group.updateMatrixWorld(true);
    const out = [];
    group.traverse((o) => {
      if (o.isMesh) out.push(o.geometry.clone().applyMatrix4(o.matrixWorld));
    });
    return out;
  }
  if (ext === "stl") return [new STLLoader().parse(data)];
  if (ext === "ply") return [new PLYLoader().parse(data)];
  throw new Error(`Format non pris en charge : ${ext}`);
}

/** Position seule (couleurs, UV et normales du scan sont ignorées), fusionnée. */
export function mergePositions(geometries) {
  if (!geometries.length) throw new Error("Aucun maillage dans ce fichier.");
  const clean = geometries.map((g) => {
    const out = new THREE.BufferGeometry();
    const src = g.index ? g.toNonIndexed() : g;
    out.setAttribute("position", src.getAttribute("position").clone());
    return out;
  });
  return clean.length === 1 ? clean[0] : mergeGeometries(clean, false);
}

export function demoGeometry() {
  // Échantillon de laboratoire procédural (aucune licence tierce) : nœud torique.
  return new THREE.TorusKnotGeometry(0.34, 0.12, 720, 120, 2, 3).toNonIndexed();
}

// ───────────────────────────── géométrie ─────────────────────────────

function orient(geometry, opts) {
  const rot = new THREE.Euler(
    THREE.MathUtils.degToRad(opts.rotateX),
    THREE.MathUtils.degToRad(opts.rotateY),
    THREE.MathUtils.degToRad(opts.rotateZ),
  );
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rot));
  return geometry;
}

/** Centre le modèle et ramène sa hauteur à 1. */
function normalize(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / size.y, 1 / size.y, 1 / size.y);
  return geometry;
}

function weld(geometry) {
  geometry.computeBoundingBox();
  const diag = geometry.boundingBox.getSize(new THREE.Vector3()).length();
  const indexed = mergeVertices(geometry, diag * 1e-6);
  indexed.deleteAttribute("normal");
  return indexed;
}

/** Supprime un socle : retire les triangles dont tous les sommets sont sous le seuil. */
function cutBase(geometry, fraction) {
  if (!fraction) return geometry;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const cut = min.y + (max.y - min.y) * fraction;
  const pos = geometry.getAttribute("position");
  const index = geometry.index.array;
  const kept = [];
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]];
    if (pos.getY(a) > cut || pos.getY(b) > cut || pos.getY(c) > cut) kept.push(a, b, c);
  }
  geometry.setIndex(kept);
  return compact(geometry);
}

/** Retire les sommets inutilisés. */
function compact(geometry) {
  const pos = geometry.getAttribute("position");
  const index = geometry.index.array;
  const remap = new Int32Array(pos.count).fill(-1);
  const positions = [];
  const newIndex = new Uint32Array(index.length);
  let next = 0;
  for (let i = 0; i < index.length; i++) {
    const v = index[i];
    if (remap[v] === -1) {
      remap[v] = next++;
      positions.push(pos.getX(v), pos.getY(v), pos.getZ(v));
    }
    newIndex[i] = remap[v];
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setIndex(new THREE.BufferAttribute(newIndex, 1));
  return out;
}

async function simplify(geometry, targetTriangles, log) {
  const triangles = geometry.index.count / 3;
  if (triangles <= targetTriangles) return geometry;
  await MeshoptSimplifier.ready;
  const positions = geometry.getAttribute("position").array;
  const indices = Uint32Array.from(geometry.index.array);
  const [result, error] = MeshoptSimplifier.simplify(
    indices,
    positions,
    3,
    targetTriangles * 3,
    0.005,
    ["Prune"],
  );
  log(
    `simplification : ${triangles} → ${result.length / 3} triangles (erreur relative ${error.toExponential(2)})`,
  );
  geometry.setIndex(new THREE.BufferAttribute(result, 1));
  return compact(geometry);
}

// ───────────────────────────── cuisson des creux ─────────────────────────────

function hemisphereDirections(n) {
  // Distribution de Fibonacci pondérée par le cosinus (repère local, z = normale).
  const dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const r = Math.sqrt(u);
    const phi = i * golden;
    dirs.push(new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(1 - u)));
  }
  return dirs;
}

function adjacency(geometry) {
  const count = geometry.getAttribute("position").count;
  const index = geometry.index.array;
  const sets = Array.from({ length: count }, () => new Set());
  for (let i = 0; i < index.length; i += 3) {
    const [a, b, c] = [index[i], index[i + 1], index[i + 2]];
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets.map((s) => Uint32Array.from(s));
}

function percentile(values, p) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function smooth(values, neighbours, passes) {
  let out = values;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (const j of neighbours[i]) s += out[j];
      next[i] = neighbours[i].length ? 0.5 * out[i] + (0.5 * s) / neighbours[i].length : out[i];
    }
    out = next;
  }
  return out;
}

/** Cuit deux canaux : _CAVITY (creux : occlusion + concavité) et _CONVEX (crêtes saillantes). */
async function bakeCavity(geometry, opts, log, onProgress) {
  const pos = geometry.getAttribute("position");
  const nor = geometry.getAttribute("normal");
  const count = pos.count;
  geometry.computeBoundingBox();
  const diag = geometry.boundingBox.getSize(new THREE.Vector3()).length();
  const radius = diag * opts.radius;
  // BVH de la pièce + un sol sous le socle : la base reçoit l'occlusion de contact.
  const minY = geometry.boundingBox.min.y;
  const piece = new THREE.BufferGeometry();
  piece.setAttribute("position", pos.clone());
  piece.setIndex(geometry.index.clone());
  const ground = new THREE.PlaneGeometry(diag * 4, diag * 4)
    .rotateX(-Math.PI / 2)
    .translate(0, minY - diag * 1e-4, 0);
  ground.deleteAttribute("normal");
  ground.deleteAttribute("uv");
  const bvh = new MeshBVH(mergeGeometries([piece, ground], false));
  const dirs = hemisphereDirections(opts.rays);
  const neighbours = adjacency(geometry);

  const ao = new Float32Array(count);
  const conc = new Float32Array(count);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const q = new THREE.Vector3();
  const t = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  const ray = new THREE.Ray();

  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i).normalize();
    // Concavité (courbure moyenne discrète) : hauteur des voisins au-dessus du plan
    // tangent, divisée par la longueur d'arête au carré (indépendante de la densité du maillage).
    let c = 0;
    let edge = 0;
    for (const j of neighbours[i]) {
      q.fromBufferAttribute(pos, j).sub(p);
      const len2 = q.lengthSq() || 1e-12;
      c += q.dot(n) / len2;
      edge += Math.sqrt(len2);
    }
    const k = neighbours[i].length;
    conc[i] = k ? c / k : 0;
    const meanEdge = k ? edge / k : diag * 1e-3;
    // Occlusion ambiante locale. Le jeu de rayons pivote autour de la normale d'un angle
    // pseudo-aléatoire par sommet : l'échantillonnage devient un bruit fin, effacé au lissage.
    t.set(Math.abs(n.x) > 0.9 ? 0 : 1, Math.abs(n.x) > 0.9 ? 1 : 0, 0)
      .cross(n)
      .normalize();
    b.crossVectors(n, t);
    const spin = (((i * 2654435761) >>> 0) / 4294967296) * Math.PI * 2;
    const [cs, sn] = [Math.cos(spin), Math.sin(spin)];
    q.copy(t).multiplyScalar(cs).addScaledVector(b, sn);
    b.copy(t).multiplyScalar(-sn).addScaledVector(b, cs);
    t.copy(q);
    ray.origin.copy(p).addScaledVector(n, diag * 1e-4);
    let occ = 0;
    for (const dir of dirs) {
      d.set(0, 0, 0).addScaledVector(t, dir.x).addScaledVector(b, dir.y).addScaledVector(n, dir.z);
      ray.direction.copy(d);
      // Départ à 0,75 arête : les rayons rasants ne touchent pas les triangles voisins.
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide, 0.75 * meanEdge, radius);
      if (hit) occ += 1 - 0.5 * (hit.distance / radius);
    }
    ao[i] = occ / dirs.length;
    if (i % 20000 === 0 && i) log(`creux : ${i} / ${count} sommets`);
    // Navigateur : rendre la main régulièrement (barre de progression, page réactive).
    if (onProgress && i % 2000 === 0) {
      onProgress(i / count);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Normalisation robuste, combinaison, lissage.
  const remap = (arr, lo, hi) =>
    arr.map((v) => THREE.MathUtils.clamp((v - lo) / (hi - lo || 1), 0, 1));
  // Bornes FIXES pour l'occlusion : les réglages de patine valent pour tous les modèles.
  const aoN = remap(ao, 0, 0.55);
  const concN = remap(conc, percentile(conc, 0.05), percentile(conc, 0.95));
  const cav = smooth(
    aoN.map((v, i) => 0.7 * v + 0.3 * concN[i]),
    neighbours,
    3,
  );
  // Convexité : l'inverse de la concavité, peu lissée pour garder les arêtes nettes
  // (nez, arcades, mèches) : c'est là que le ciseleur polit le métal.
  const convexRaw = smooth(
    conc.map((v) => -v),
    neighbours,
    1,
  );
  return {
    cavity: remap(cav, 0, 0.85),
    convex: remap(convexRaw, percentile(convexRaw, 0.05), percentile(convexRaw, 0.995)),
  };
}

// ───────────────────────────── pipeline ─────────────────────────────

/**
 * Prépare une géométrie brute (positions) et renvoie un document glTF compressé, prêt à
 * être écrit (NodeIO.write / WebIO.writeBinary), avec son nombre de triangles.
 * `onProgress(fraction)` (facultatif) : étape la plus longue, la cuisson des creux.
 */
export async function prepareModel(raw, options = {}, log = () => {}, onProgress) {
  const opts = { ...DEFAULTS, ...options };
  let geometry = raw;
  log(`lecture : ${geometry.getAttribute("position").count / 3} triangles`);
  geometry = weld(geometry);
  geometry = normalize(orient(geometry, opts));
  geometry = cutBase(geometry, opts.keepLowest);
  geometry = await simplify(geometry, opts.triangles, log);
  geometry = normalize(geometry);
  geometry.computeVertexNormals();
  log(
    `creux : cuisson sur ${geometry.getAttribute("position").count} sommets (${opts.rays} rayons)`,
  );
  const { cavity, convex } = await bakeCavity(geometry, opts, log, onProgress);

  const doc = new Document();
  const buffer = doc.createBuffer();
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", acc("VEC3", geometry.getAttribute("position").array))
    .setAttribute("NORMAL", acc("VEC3", geometry.getAttribute("normal").array))
    .setAttribute("_CAVITY", acc("SCALAR", cavity))
    .setAttribute("_CONVEX", acc("SCALAR", convex))
    .setIndices(acc("SCALAR", Uint32Array.from(geometry.index.array)))
    .setMaterial(doc.createMaterial("bronze").setMetallicFactor(1).setRoughnessFactor(0.35));
  const mesh = doc.createMesh("sculpture").addPrimitive(prim);
  doc.createScene().addChild(doc.createNode("sculpture").setMesh(mesh));

  await MeshoptEncoder.ready;
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "high", quantizeGeneric: 8 }));
  return { doc, triangles: (geometry.index.count / 3) | 0 };
}
