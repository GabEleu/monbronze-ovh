import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { site, type StepId } from "@/content/site";
import { getRealisation, getRealisations } from "@/content/realisations";
import { pageMetadata } from "@/lib/seo";
import { FinalCta } from "@/components/sections/FinalCta";
import { IllustrativeBadge, StepPill } from "@/components/ui/Badge";
import { pad } from "@/components/ui/Eyebrow";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { StoryVisual } from "@/components/ui/StoryVisual";
import { realisationCaption, realisationModel, realisationVisual } from "@/lib/content/resolve";

// Cache Components : pas de `dynamicParams`. Toutes les histoires sont pré-générées ;
// un slug inconnu renvoie la page 404 via notFound().
export async function generateStaticParams() {
  const items = await getRealisations();
  return items.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/realisations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRealisation(slug);
  if (!data) return {};
  const { realisation: r } = data;
  const suffix = r.type === "illustratif" ? ` (${site.realisations.badge.toLowerCase()})` : "";
  return pageMetadata({
    title: `${r.titre}${suffix}`,
    description: r.description,
    path: `/realisations/${r.slug}`,
  });
}

const stepIndex = (id: StepId) => site.steps.findIndex((s) => s.id === id) + 1;
const stepTitle = (id: StepId) => site.steps.find((s) => s.id === id)?.title ?? id;

export default async function RealisationPage({ params }: PageProps<"/realisations/[slug]">) {
  const { slug } = await params;
  const data = await getRealisation(slug);
  if (!data) notFound();

  const { realisation: r, prev, next } = data;
  const t = site.realisations;
  const univers = site.univers[r.univers];
  const patine = r.patine ? site.patines.find((p) => p.id === r.patine)?.label : undefined;

  return (
    <>
      <article>
        <header className="story-hero theme-dark relative overflow-hidden">
          <div className="container-page grid gap-12 pt-14 pb-16 md:pt-20 lg:grid-cols-12 lg:gap-8 lg:pb-24">
            <div className="flex flex-col gap-8 lg:col-span-5">
              <TransitionLink
                href="/realisations"
                className="label-mono self-start text-ink-muted transition-colors hover:text-ink"
              >
                ← {t.labels.all}
              </TransitionLink>
              <p className="label-mono text-ink-muted">
                {univers.label} · {univers.theme}
              </p>
              <h1 className="text-h1">{r.titre}</h1>
              <p className="text-lead text-ink">{r.description}</p>
              {r.type === "illustratif" && (
                <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
                  <IllustrativeBadge />
                  <p className="max-w-md text-sm text-ink-muted">{t.badgeNote}</p>
                </div>
              )}
            </div>
            <div className="relative lg:col-span-6 lg:col-start-7">
              <StoryVisual
                slug={r.slug}
                visual={realisationVisual(r)}
                model={realisationModel(r)?.src}
                patine={r.patine ?? "brun-medaille"}
                legend={realisationCaption(r)}
              />
            </div>
          </div>
        </header>

        <section aria-label={univers.label} className="theme-light section">
          <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col gap-5 lg:col-span-5">
              <h2 className="label-mono text-ink-muted">{t.labels.need}</h2>
              <p className="font-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-tight [font-variation-settings:'SOFT'_20,'opsz'_72]">
                {r.besoin}
              </p>
            </div>
            <div className="flex flex-col gap-5 lg:col-span-6 lg:col-start-7">
              <h2 className="label-mono text-ink-muted">{t.labels.solution}</h2>
              <p className="text-lead">{r.solution}</p>

              <h2 className="label-mono mt-6 text-ink-muted">{t.labels.steps}</h2>
              <ul className="flex flex-wrap gap-2">
                {r.etapes.map((id) => (
                  <li key={id}>
                    <StepPill index={stepIndex(id)} label={stepTitle(id)} />
                  </li>
                ))}
              </ul>

              {patine && (
                <p className="label-mono mt-6 text-ink-muted">
                  {t.labels.patine}&nbsp;: <span className="text-ink">{patine}</span>
                </p>
              )}
            </div>
          </div>
        </section>
      </article>

      <nav aria-label={t.labels.others} className="theme-dark border-t border-line">
        <div className="container-page grid sm:grid-cols-2">
          {[
            { item: prev, label: t.labels.prev, align: "" },
            { item: next, label: t.labels.next, align: "sm:items-end sm:text-right sm:border-l" },
          ].map(({ item, label, align }) => (
            <TransitionLink
              key={label}
              href={`/realisations/${item.slug}`}
              className={`group/nav flex flex-col gap-3 border-line py-10 sm:px-6 first:sm:pl-0 last:sm:pr-0 ${align}`}
            >
              <span className="label-mono text-ink-muted">
                {label} · {pad(item.ordre)}
              </span>
              <span className="font-serif text-[clamp(1.5rem,3vw,2.75rem)] leading-tight transition-colors group-hover/nav:text-or">
                {item.titre}
              </span>
            </TransitionLink>
          ))}
        </div>
      </nav>

      <FinalCta title={t.labels.similar} text={t.labels.similarText} />
    </>
  );
}
