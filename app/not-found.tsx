import type { Metadata } from "next";
import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { Molten404 } from "@/components/ui/Molten404";

// Next.js ajoute lui-même <meta name="robots" content="noindex"> sur cette page.
export const metadata: Metadata = {
  title: site.seo.notFound.title,
  description: site.seo.notFound.description,
};

/** « Cette page est repartie à la fonte » : le « 404 » en métal fondu coule, puis se reforme sous la souris. */
export default function NotFound() {
  const t = site.notFound;
  return (
    <section className="theme-dark relative isolate flex min-h-[calc(100svh-var(--header-h))] items-center overflow-hidden">
      <div aria-hidden="true" className="hero-pour" />
      <div className="container-page flex flex-col gap-8 py-24">
        <div className="relative">
          <p
            aria-hidden="true"
            className="molten-404-text font-serif text-[clamp(7rem,30vw,26rem)] leading-[0.8] tracking-[-0.06em] text-bronze [font-variation-settings:'SOFT'_100,'opsz'_144]"
          >
            {t.code}
          </p>
          <Molten404 />
        </div>
        <h1 className="text-h1 max-w-[16ch]">{t.title}</h1>
        <p className="text-lead max-w-xl text-ink-muted">{t.text}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={t.home.href} size="lg">
            {t.home.label}
          </ButtonLink>
          <ButtonLink href={site.cta.project.href} variant="ghost" size="lg">
            {site.cta.project.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
