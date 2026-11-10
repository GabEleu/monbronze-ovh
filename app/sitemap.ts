import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { getRealisations } from "@/content/realisations";

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/concept", priority: 0.9 },
  { path: "/comment-ca-marche", priority: 0.9 },
  { path: "/realisations", priority: 0.8 },
  { path: "/qui-sommes-nous", priority: 0.8 },
  { path: "/contact", priority: 0.9 },
  { path: "/mentions-legales", priority: 0.2 },
  { path: "/confidentialite", priority: 0.2 },
  { path: "/credits", priority: 0.2 },
];

// /lab est volontairement absent (page interne, noindex).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const realisations = await getRealisations();
  return [
    ...STATIC_ROUTES.map(({ path, priority }) => ({
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      priority,
    })),
    ...realisations.map((r) => ({ url: `${SITE_URL}/realisations/${r.slug}`, priority: 0.6 })),
  ];
}
