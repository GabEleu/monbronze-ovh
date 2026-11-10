"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { environments } from "@/content/assets";

export type StudioEnv = keyof typeof environments | "procedural";

/**
 * Éclairage de studio « photo produit » : lumière NEUTRE (la couleur vient du métal,
 * pas de la lumière) et contrastée (une principale courte, deux bandeaux arrière qui
 * dessinent la silhouette, le reste tombe dans le noir). HDR Poly Haven (CC0) en fond
 * de carte d'environnement, boîtes à lumière procédurales par-dessus. Rendu une seule
 * fois (frames = 1) : aucun coût par image.
 */
export function Studio({
  intensity = 0.35,
  env = "studio",
  resolution = 1024,
}: {
  intensity?: number;
  env?: StudioEnv;
  /** Résolution du cube d'environnement : 1024 pour /lab, bien moins sur le site. */
  resolution?: number;
}) {
  const hdr = env === "procedural" ? undefined : environments[env];
  return (
    <Environment resolution={resolution} environmentIntensity={intensity} files={hdr?.src}>
      {!hdr && <color attach="background" args={["#050505"]} />}
      {/* Principale : courte, en hauteur, côté droit */}
      <Lightformer
        form="rect"
        intensity={6}
        color="#ffffff"
        position={[2.2, 2.6, 1.4]}
        scale={[2.2, 1.4, 1]}
        target={[0, 0, 0]}
      />
      {/* Bandeaux arrière : liserés sur la silhouette */}
      <Lightformer
        form="rect"
        intensity={4}
        color="#ffffff"
        position={[-2.6, 0.8, -1.4]}
        scale={[0.4, 4, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={4}
        color="#ffffff"
        position={[2.6, 0.8, -1.4]}
        scale={[0.4, 4, 1]}
        target={[0, 0, 0]}
      />
      {/* Sol : rebond neutre et sombre */}
      <Lightformer
        form="rect"
        intensity={0.4}
        color="#1a1816"
        position={[0, -2, 0]}
        rotation-x={Math.PI / 2}
        scale={[12, 12, 1]}
      />
    </Environment>
  );
}
