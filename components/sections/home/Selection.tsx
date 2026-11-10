import { site } from "@/content/site";
import { getRealisations } from "@/content/realisations";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RealisationCard } from "@/components/ui/RealisationCard";

export async function Selection() {
  const t = site.home.selection;
  const all = await getRealisations();
  const featured = t.featured
    .map((slug) => all.find((r) => r.slug === slug))
    .filter((r) => r !== undefined);

  return (
    <section aria-labelledby="selection-title" className="theme-light section">
      <div className="container-page flex flex-col gap-16 md:gap-20">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow index={6} total={8}>
              {t.eyebrow}
            </Eyebrow>
            <h2 id="selection-title" className="text-h2 mt-6 max-w-[18ch]">
              {t.title}
            </h2>
          </div>
          <ButtonLink href={t.link.href} variant="ghost" arrow className="self-start md:self-auto">
            {t.link.label}
          </ButtonLink>
        </div>

        <div className="grid gap-x-8 gap-y-16 md:grid-cols-3">
          {featured.map((r) => (
            <RealisationCard key={r.slug} realisation={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
