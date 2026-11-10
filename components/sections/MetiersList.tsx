import { site } from "@/content/site";
import { assets } from "@/content/assets";
import { pad } from "@/components/ui/Eyebrow";
import { Visual } from "@/components/ui/Visual";

/** Les cinq métiers, chacun représenté par l'état de la sculpture (aucun visage inventé). */
export function MetiersList({ headingLevel = 3 }: { headingLevel?: 3 | 4 }) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const first = assets[site.metiers[0]!.asset];
  const legend = first.kind === "image" ? first.legend : undefined;
  return (
    <div className="flex flex-col gap-4">
      <ol className="border-t border-line">
        {site.metiers.map((m, i) => (
          <li
            key={m.id}
            className="grid grid-cols-[4.5rem_1fr] items-center gap-5 border-b border-line py-4 sm:grid-cols-[6rem_1fr_auto]"
          >
            <Visual id={m.asset} ratio="square" labels={false} />
            <div className="flex flex-col gap-1">
              <span className="label-mono text-ink-muted">{pad(i + 1)}</span>
              <Heading className="font-serif text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none">
                {m.title}
              </Heading>
            </div>
            <span className="label-mono col-start-2 text-ink-muted sm:col-start-auto sm:text-right">
              {m.state}
            </span>
          </li>
        ))}
      </ol>
      {legend && (
        <p className="font-mono text-xs text-ink-muted">
          {site.realisations.render} {legend}
        </p>
      )}
    </div>
  );
}
