#!/usr/bin/env node
/** Inspecte un GLB préparé : triangles, taille, distribution de l'attribut _CAVITY. */
import { stat } from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const acc = prim.getAttribute("_CAVITY");
  const tris = prim.getIndices().getCount() / 3;
  const { size } = await stat(f);
  if (!acc) {
    console.log(`${f} · ${tris} triangles · ${(size / 1024) | 0} Ko · pas de _CAVITY`);
    continue;
  }
  const n = acc.getCount();
  const el = [0];
  const bins = new Array(10).fill(0);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    acc.getElement(i, el);
    sum += el[0];
    bins[Math.min(9, Math.floor(el[0] * 10))]++;
  }
  console.log(
    `${f} · ${tris} triangles · ${(size / 1024) | 0} Ko · creux moyen ${(sum / n).toFixed(2)}`,
  );
  console.log(
    `  histogramme (0 → 1) : ${bins.map((b) => `${((b / n) * 100).toFixed(0)}%`).join(" ")}`,
  );
}
