import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCta } from "@/components/sections/FinalCta";
import { SourcesGrid } from "@/components/sections/SourcesGrid";
import { pad } from "@/components/ui/Eyebrow";
import { Visual } from "@/components/ui/Visual";

export const metadata = pageMetadata({ ...site.seo.howItWorks, path: "/comment-ca-marche" });

export default function HowItWorksPage() {
  const t = site.howItWorks;
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} />

      {/* A. Six cas */}
      <div className="theme-light section">
        <div className="container-page">
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {t.cases.map((c, i) => (
              <li key={c.title} className="flex flex-col gap-6">
                <Visual id={c.asset} ratio="landscape" />
                <div className="grid grid-cols-[2.5rem_1fr] gap-3">
                  <span className="label-mono pt-1.5 text-ink-muted">{pad(i + 1)}</span>
                  <p className="font-serif text-2xl leading-tight [font-variation-settings:'SOFT'_0,'opsz'_36]">
                    {c.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* B. Les sources */}
      <section aria-labelledby="sources-title" className="theme-dark section">
        <div className="container-page flex flex-col gap-14">
          <h2 id="sources-title" className="text-h2 max-w-[16ch]">
            {site.sources.title}
          </h2>
          <SourcesGrid />
        </div>
      </section>

      {/* C. Les cinq étapes, reliées par une ligne de métal */}
      <section aria-labelledby="process-title" className="theme-light section">
        <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-8">
          <h2
            id="process-title"
            className="text-h2 max-w-[14ch] lg:sticky lg:top-32 lg:col-span-5 lg:self-start"
          >
            {t.process.title}
          </h2>
          <ol className="relative lg:col-span-6 lg:col-start-7">
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-3 left-[0.6875rem] w-px bg-linear-to-b from-or via-bronze to-line"
            />
            {t.process.items.map((step, i) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[1.5rem_1fr] gap-6 pb-14 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 mt-1.5 size-[1.375rem] rounded-full border border-bronze bg-ivoire after:absolute after:inset-1.5 after:rounded-full after:bg-bronze"
                />
                <div className="flex flex-col gap-3">
                  <span className="label-mono text-ink-muted">
                    {pad(i + 1)} / {pad(t.process.items.length)}
                  </span>
                  <h3 className="text-h3 uppercase">{step.title}</h3>
                  <p className="max-w-lg text-ink-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
