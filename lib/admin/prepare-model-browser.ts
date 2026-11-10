/**
 * Préparation d'un modèle 3D DANS LE NAVIGATEUR de l'administrateur (aucun logiciel sur le
 * serveur) : même chaîne que `scripts/prepare-model.mjs` (lib/model-pipeline.mjs), puis
 * écriture d'un GLB compressé de 3 Mo au plus (le nombre de triangles baisse si besoin).
 * Chargé à la demande : rien de tout cela n'entre dans les pages publiques.
 */
const MAX_BYTES = 3 * 1024 * 1024;

export async function prepareModelInBrowser(
  file: File,
  orientation: { rotateX: number; rotateY: number },
  onProgress: (fraction: number) => void,
): Promise<Uint8Array> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const [{ WebIO }, { ALL_EXTENSIONS }, meshopt, pipeline] = await Promise.all([
    import("@gltf-transform/core"),
    import("@gltf-transform/extensions"),
    import("meshoptimizer"),
    import("@/lib/model-pipeline.mjs"),
  ]);
  if (!pipeline.MODEL_EXTENSIONS.includes(ext)) {
    throw new Error("Format non pris en charge (GLB, OBJ, STL ou PLY).");
  }
  const buffer = await file.arrayBuffer();

  let geometries;
  if (ext === "glb" || ext === "gltf") {
    await meshopt.MeshoptDecoder.ready;
    const io = new WebIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ "meshopt.decoder": meshopt.MeshoptDecoder });
    const doc =
      ext === "glb"
        ? await io.readBinary(new Uint8Array(buffer))
        : await io.readJSON({ json: JSON.parse(new TextDecoder().decode(buffer)), resources: {} });
    geometries = pipeline.geometriesFromGltf(doc);
  } else {
    geometries = pipeline.geometriesFromMesh(
      ext,
      ext === "obj" ? new TextDecoder().decode(buffer) : buffer,
    );
  }
  const raw = pipeline.mergePositions(geometries);

  await meshopt.MeshoptEncoder.ready;
  const writer = new WebIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.encoder": meshopt.MeshoptEncoder });
  let triangles = 100_000;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { doc } = await pipeline.prepareModel(
      raw.clone(),
      { ...orientation, triangles },
      () => undefined,
      onProgress,
    );
    const glb = await writer.writeBinary(doc);
    if (glb.byteLength <= MAX_BYTES) return glb;
    triangles = Math.round(triangles * 0.6);
  }
  throw new Error("Modèle trop détaillé, même simplifié.");
}
