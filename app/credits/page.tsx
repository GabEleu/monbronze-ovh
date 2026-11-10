import { mediaCredits } from "@/content/assets";
import { site } from "@/content/site";
import { frTypo } from "@/lib/fr";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { TransitionLink } from "@/components/ui/TransitionLink";

export const metadata = pageMetadata({ ...site.seo.credits, path: "/credits" });

export default function CreditsPage() {
  const t = site.credits;
  // Le groupe « médias » est alimenté par content/assets.ts (modèles 3D, environnements).
  const media = mediaCredits().map((c) => ({
    name: frTypo(c.title),
    author: frTypo(`${c.author} · ${c.source}`),
    license: c.license,
    url: c.url,
    usage: frTypo(c.usage),
  }));
  const groups = t.groups.map((g) => ("empty" in g ? { ...g, items: media } : g));
  return (
    <>
      <PageHero eyebrow={site.footer.legalTitle} title={t.title} lead={t.intro} />
      <div className="theme-light section">
        <div className="container-page flex flex-col gap-20">
          <p className="max-w-3xl border-l-2 border-bronze pl-5 text-ink">{t.disclaimer}</p>
          {groups.map((group, gi) => (
            <section
              key={group.title}
              aria-labelledby={`g-${gi}`}
              className="grid gap-8 lg:grid-cols-12 lg:gap-8"
            >
              <h2 id={`g-${gi}`} className="text-h3 lg:col-span-4">
                {group.title}
              </h2>
              <div className="lg:col-span-8">
                {group.items.length === 0 && "empty" in group ? (
                  <p className="max-w-2xl border-t border-line pt-6 text-ink-muted">
                    {group.empty}
                  </p>
                ) : (
                  <ul className="border-t border-line">
                    {group.items.map((item) => (
                      <li
                        key={item.name}
                        className="grid gap-2 border-b border-line py-5 md:grid-cols-[1.2fr_1fr_1.3fr] md:items-baseline md:gap-6"
                      >
                        <div className="flex flex-col gap-1">
                          <TransitionLink
                            href={item.url}
                            className="font-serif text-2xl leading-tight underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                          >
                            {item.name}
                          </TransitionLink>
                          <span className="text-sm text-ink-muted">{item.author}</span>
                        </div>
                        <p className="text-sm text-ink">
                          <span className="label-mono mr-2 text-ink-muted">{t.labels.usage}</span>
                          {item.usage}
                        </p>
                        <p className="text-sm text-ink">
                          <span className="label-mono mr-2 text-ink-muted">{t.labels.license}</span>
                          {item.license}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
