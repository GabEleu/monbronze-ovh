import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/sections/LegalPage";
import { getPages } from "@/lib/content/editable";

export const metadata = pageMetadata({ ...site.seo.mentions, path: "/mentions-legales" });

export default async function MentionsPage() {
  const t = site.legal.mentions;
  // Contenu modifiable dans l'espace d'administration (par défaut : celui de site.ts).
  const page = (await getPages()).mentions;
  return (
    <LegalPage
      eyebrow={site.footer.legalTitle}
      title={t.title}
      updated={page.updated}
      sections={page.sections}
    />
  );
}
