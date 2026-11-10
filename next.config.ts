import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components : rendu statique par défaut, vérifié par `ensureStatic`
  // (voir app/layout.tsx). Pas de `dynamicParams` dans ce mode.
  cacheComponents: true,
  // Serveur autonome (.next/standalone/server.js) : hébergement sur un VPS (OVHcloud),
  // sans node_modules complet. Voir DEPLOIEMENT-OVH.md.
  output: "standalone",
  partialPrefetching: true,
  // Les réalisations sont lues sur le disque (content/realisations/*.json) :
  // on s'assure qu'elles sont embarquées si une page est régénérée en production.
  outputFileTracingIncludes: {
    "/**": ["./content/realisations/**/*"],
  },
  turbopack: {
    // Un package-lock.json traîne dans le dossier utilisateur : on fixe la racine du projet.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
