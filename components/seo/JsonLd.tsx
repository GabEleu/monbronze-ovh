import { CONTACT_EMAIL, SITE_URL, site } from "@/content/site";

/**
 * Données structurées (BRIEF.md §8) : seulement des faits connus (CLAUDE.md, honnêteté) :
 * nom du site, fonderie d'art en Île-de-France, adresse e-mail. Aucune adresse postale,
 * date ni avis inventés.
 */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "monbronze.fr",
    url: SITE_URL,
    email: CONTACT_EMAIL,
    description: site.seo.default.description,
    slogan: site.brand.baseline,
    areaServed: { "@type": "AdministrativeArea", name: "Île-de-France" },
    knowsAbout: ["Fonderie d'art", "Fonte à la cire perdue", "Sculpture en bronze", "Patine"],
  };
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sculpture en bronze sur mesure",
    serviceType: "Fonderie d'art : fonte à la cire perdue, ciselure et patine",
    provider: { "@type": "Organization", name: "monbronze.fr", url: SITE_URL },
    areaServed: { "@type": "AdministrativeArea", name: "Île-de-France" },
    description: site.home.hero.text,
  };
  return (
    <script
      type="application/ld+json"
      // Contenu statique, sans donnée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify([data, service]) }}
    />
  );
}
