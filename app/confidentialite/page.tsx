import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/sections/LegalPage";
import { getPages } from "@/lib/content/editable";

export const metadata = pageMetadata({ ...site.seo.privacy, path: "/confidentialite" });

export default async function PrivacyPage() {
  const t = site.legal.privacy;
  // Contenu modifiable dans l'espace d'administration (par défaut : celui de site.ts).
  const page = (await getPages()).confidentialite;
  return (
    <LegalPage
      eyebrow={site.footer.legalTitle}
      title={t.title}
      updated={page.updated}
      sections={page.sections}
    />
  );
}
