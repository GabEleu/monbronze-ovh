import { site } from "@/content/site";
import { getRealisations } from "@/content/realisations";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCta } from "@/components/sections/FinalCta";
import { RealisationCard } from "@/components/ui/RealisationCard";
import { ScrollSkew } from "@/components/ui/ScrollSkew";

export const metadata = pageMetadata({ ...site.seo.realisations, path: "/realisations" });

export default async function RealisationsPage() {
  const t = site.realisations;
  const items = await getRealisations();
  return (
    <>
      <ScrollSkew />
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.intro} />
      <section aria-label={t.eyebrow} className="theme-light section">
        <div className="container-page grid gap-x-8 gap-y-20 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <RealisationCard key={r.slug} realisation={r} headingLevel={2} />
          ))}
        </div>
      </section>
      <FinalCta title={t.labels.similar} text={t.labels.similarText} />
    </>
  );
}
