import { CONTACT_EMAIL, site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PourOnView } from "@/components/ui/PourOnView";

/** Appel final « Et si nous parlions de votre projet ? » (accueil et pages intérieures). */
export function FinalCta({
  index,
  title,
  text,
}: {
  index?: number;
  title?: string;
  text?: string;
}) {
  const t = site.home.final;
  return (
    <section aria-labelledby="final-title" className="theme-light section relative overflow-hidden">
      <div className="container-page flex flex-col items-center gap-10 text-center">
        {index !== undefined && (
          <Eyebrow index={index} total={8}>
            {t.eyebrow}
          </Eyebrow>
        )}
        <h2 id="final-title" className="text-h1 max-w-[16ch]">
          {title ?? t.title}
        </h2>
        <p className="text-lead max-w-xl text-ink-muted">{text ?? t.text}</p>
        <PourOnView>
          <ButtonLink href={site.cta.project.href} glow size="lg">
            {site.cta.project.label}
          </ButtonLink>
        </PourOnView>
        <p className="text-sm text-ink-muted">
          {t.write}{" "}
          <TransitionLink
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            {CONTACT_EMAIL}
          </TransitionLink>
        </p>
      </div>
    </section>
  );
}
