import type { Realisation } from "@/content/realisations";
import { site } from "@/content/site";
import { IllustrativeBadge } from "@/components/ui/Badge";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Visual } from "@/components/ui/Visual";
import { StoryThumb } from "@/components/ui/StoryVisual";
import { realisationCaption, realisationVisual } from "@/lib/content/resolve";

export function RealisationCard({
  realisation,
  headingLevel = 3,
}: {
  realisation: Realisation;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const univers = site.univers[realisation.univers];
  return (
    <article data-cursor="story" className="group/card relative flex flex-col gap-6">
      <div className="relative overflow-hidden">
        <StoryThumb slug={realisation.slug}>
          <Visual
            asset={realisationVisual(realisation)}
            ratio="portrait"
            labels={false}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
            className="card-media transition-transform duration-1000 ease-expo-out group-hover/card:scale-[1.03]"
          />
        </StoryThumb>
        {realisation.type === "illustratif" && (
          <IllustrativeBadge className="absolute right-4 bottom-4 z-10" />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="label-mono text-ink-muted">
          {univers.label} · {univers.theme}
        </p>
        <Heading className="text-h3">
          <TransitionLink
            href={`/realisations/${realisation.slug}`}
            plain
            className="after:absolute after:inset-0 after:content-['']"
          >
            {realisation.titre}
          </TransitionLink>
        </Heading>
        <p className="text-ink-muted">{realisation.description}</p>
        {realisationCaption(realisation) && (
          <p className="font-mono text-xs leading-relaxed text-ink-muted">
            {realisationCaption(realisation)}
          </p>
        )}
        <span aria-hidden="true" className="label-mono mt-2 text-ink">
          {site.realisations.labels.read} →
        </span>
      </div>
    </article>
  );
}
