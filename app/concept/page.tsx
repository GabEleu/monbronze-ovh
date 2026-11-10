import { DEONTOLOGIE_URL, site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCta } from "@/components/sections/FinalCta";
import { pad } from "@/components/ui/Eyebrow";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Visual } from "@/components/ui/Visual";
import { assets } from "@/content/assets";

export const metadata = pageMetadata({ ...site.seo.concept, path: "/concept" });

export default function ConceptPage() {
  const t = site.concept;
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      {/* A. Le concept */}
      <section aria-label={t.eyebrow} className="theme-light section">
        <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-8">
          <p className="label-mono text-ink-muted lg:col-span-3">{t.ambition}</p>
          <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:col-span-8 lg:col-start-5">
            {t.paragraphs.map((p) => (
              <p key={p} className="text-ink">
                {p}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-4 border-t border-line pt-8 lg:col-span-8 lg:col-start-5">
            <p className="font-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight [font-variation-settings:'SOFT'_30,'opsz'_72]">
              {t.deontology.text}
            </p>
            <TransitionLink
              href={DEONTOLOGIE_URL}
              className="label-mono self-start text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
            >
              {t.deontology.link} ↗
            </TransitionLink>
          </div>
        </div>
      </section>

      {/* B. Pour qui */}
      <section aria-labelledby="audience-title" className="theme-dark section">
        <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-4">
            <h2 id="audience-title" className="text-h2 max-w-[12ch]">
              {t.audience.title}
            </h2>
            <p className="max-w-sm text-ink-muted">{t.audience.intro}</p>
          </div>
          <ol className="lg:col-span-8 lg:col-start-5">
            {t.audience.items.map((item, i) => (
              <li
                key={item}
                className="flex items-baseline justify-between gap-6 border-t border-line py-4 last:border-b md:py-5"
              >
                <span className="font-serif text-[clamp(1.75rem,4.4vw,4.25rem)] leading-none tracking-[-0.012em]">
                  {item}
                </span>
                <span className="label-mono shrink-0 whitespace-nowrap text-ink-muted">
                  {pad(i + 1)} / {pad(t.audience.items.length)}
                </span>
              </li>
            ))}
          </ol>
          <blockquote className="lg:col-span-8 lg:col-start-5">
            <p className="text-lead max-w-2xl text-ink">{t.audience.quote}</p>
          </blockquote>
        </div>
      </section>

      {/* C. Pour quels projets ? */}
      <section aria-labelledby="projects-title" className="theme-light section">
        <div className="container-page flex flex-col gap-16">
          <div className="grid gap-6 lg:grid-cols-12">
            <h2 id="projects-title" className="text-h2 lg:col-span-6">
              {t.projects.title}
            </h2>
            <p className="text-lead text-ink-muted lg:col-span-5 lg:col-start-8 lg:self-end">
              {t.projects.intro}
            </p>
          </div>
          <ol className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            {t.projects.items.map((item, i) => {
              const asset = assets[item.asset];
              const legend = asset.kind === "image" ? asset.legend : undefined;
              return (
                // Téléphone : image à gauche, texte à droite (cinq images pleine largeur
                // faisaient trois mille pixels de défilement). L'image étant étroite, la
                // légende « Rendu numérique d'après… » passe sous le titre (.concept-project).
                <li
                  key={item.title}
                  className="concept-project flex flex-col gap-5 max-sm:grid max-sm:grid-cols-[8.5rem_1fr] max-sm:grid-rows-[auto_auto_1fr] max-sm:gap-x-5 max-sm:gap-y-2"
                >
                  <Visual id={item.asset} ratio="tall" className="max-sm:row-span-3" />
                  <span className="label-mono text-ink-muted">{pad(i + 1)}</span>
                  <h3 className="font-serif text-2xl leading-tight [font-variation-settings:'SOFT'_0,'opsz'_36] max-sm:text-xl">
                    {item.title}
                  </h3>
                  {legend && (
                    <p className="font-mono text-[0.625rem] leading-relaxed text-ink-muted sm:hidden">
                      {site.realisations.render} {legend}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="font-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight">
            {t.projects.outro}
          </p>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
