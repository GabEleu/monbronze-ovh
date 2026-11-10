import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { FinalCta } from "@/components/sections/FinalCta";
import { MetiersList } from "@/components/sections/MetiersList";
import { pad } from "@/components/ui/Eyebrow";

export const metadata = pageMetadata({ ...site.seo.about, path: "/qui-sommes-nous" });

export default function AboutPage() {
  const t = site.about;
  const [first, ...rest] = t.paragraphs;
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={first} />

      {/* A. La fonderie */}
      <section aria-label={t.eyebrow} className="theme-light section">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-8">
          {rest.map((p, i) => (
            <p
              key={p}
              className={`font-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight [font-variation-settings:'SOFT'_20,'opsz'_72] lg:col-span-7 ${
                i % 2 ? "lg:col-start-6" : "lg:col-start-2"
              }`}
            >
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* B. L'équipe : les métiers, sans visage inventé */}
      <section aria-labelledby="team-title" className="theme-dark section">
        <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <h2 id="team-title" className="text-h2 max-w-[14ch]">
              {t.team.title}
            </h2>
            <p className="text-lead text-ink-muted">{t.team.text}</p>
            <p className="label-mono border-t border-line pt-6 text-ink">{t.team.distribution}</p>
            <p className="text-sm text-ink-muted">{t.team.portraits}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <MetiersList />
          </div>
        </div>
      </section>

      {/* C. Tradition et technologies */}
      <section aria-labelledby="heritage-title" className="theme-light section">
        <div className="container-page flex flex-col gap-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <h2 id="heritage-title" className="text-h2 max-w-[14ch] lg:col-span-5">
              {t.heritage.title}
            </h2>
            <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
              {t.heritage.paragraphs.map((p, i) => (
                <p
                  key={p}
                  className={
                    i === t.heritage.paragraphs.length - 1 ? "text-lead text-ink" : "text-ink"
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          </div>

          <figure className="flex flex-col gap-6">
            <figcaption className="label-mono text-ink-muted">
              {t.heritage.timeline.label}
            </figcaption>
            <ol className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
              {t.heritage.timeline.items.map((item, i) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-6 border-b border-line py-6 pr-4 lg:border-r lg:border-b-0 lg:px-5 lg:first:pl-0 lg:last:border-r-0"
                >
                  <span className="label-mono flex items-center gap-2 text-ink-muted">
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${item.kind === "tradition" ? "bg-bronze" : "border border-ink"}`}
                    />
                    {pad(i + 1)} ·{" "}
                    {item.kind === "tradition"
                      ? t.heritage.timeline.tradition
                      : t.heritage.timeline.numerique}
                  </span>
                  <span className="font-serif text-2xl leading-tight">{item.title}</span>
                </li>
              ))}
            </ol>
          </figure>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
