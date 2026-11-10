import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

// /lab n'est PAS interdit ici : les robots doivent pouvoir lire sa balise
// <meta name="robots" content="noindex"> (une page interdite reste parfois indexée).
// Elle est absente du sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
