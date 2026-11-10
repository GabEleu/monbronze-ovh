import { site } from "@/content/site";
import { pad } from "@/components/ui/Eyebrow";

/** Les cinq sources possibles d'un projet (accueil et « Comment ça marche »). */
export function SourcesGrid({ headingLevel = 3 }: { headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <ul className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
      {site.sources.items.map((item, i) => (
        <li key={item.id} className="flex flex-col gap-10 bg-surface p-6 md:p-8 lg:min-h-80">
          <span className="label-mono text-ink-muted">
            {pad(i + 1)} / {pad(site.sources.items.length)}
          </span>
          <div className="mt-auto flex flex-col gap-3">
            <Heading className="text-h3 font-serif">{item.title}</Heading>
            <p className="text-sm text-ink-muted">{item.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
