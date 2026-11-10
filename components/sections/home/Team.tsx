import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { MetiersList } from "@/components/sections/MetiersList";

export function Team() {
  const t = site.home.team;
  return (
    <section aria-labelledby="team-title" className="theme-dark section">
      <div className="container-page grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <Eyebrow index={7} total={8}>
            {t.eyebrow}
          </Eyebrow>
          <h2 id="team-title" className="text-h2 max-w-[14ch]">
            {t.title}
          </h2>
          <p className="text-lead max-w-md text-ink-muted">{t.text}</p>
          <dl className="grid grid-cols-3 gap-4 border-t border-line pt-8">
            {t.facts.map((f) => (
              // Téléphone : chiffres alignés en haut (une étiquette sur deux lignes ne les
              // décale plus) et étiquettes resserrées (« professionnels » tient dans son tiers).
              <div key={f.label} className="flex flex-col-reverse gap-2 max-sm:justify-end">
                <dt className="label-mono text-ink-muted max-sm:text-[0.625rem] max-sm:tracking-[0.06em]">
                  {f.label}
                </dt>
                <dd className="font-serif text-[clamp(1.75rem,2.6vw,2.5rem)] leading-none whitespace-nowrap text-ink">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <ButtonLink href={t.link.href} variant="ghost" arrow>
              {t.link.label}
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <MetiersList />
        </div>
      </div>
    </section>
  );
}
