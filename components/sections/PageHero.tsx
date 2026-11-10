import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";

/** En-tête des pages intérieures : sur-titre monospace + H1 unique de la page. */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="page-title"
      className={cn("theme-dark relative overflow-hidden", className)}
    >
      <div aria-hidden="true" className="page-hero-glow" />
      <div className="container-page grid gap-10 pt-[clamp(6rem,14vw,12rem)] pb-[clamp(4rem,8vw,7rem)] lg:grid-cols-12">
        <div className="lg:col-span-10">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 id="page-title" className="text-h1 mt-6 max-w-[18ch]">
            {title}
          </h1>
        </div>
        {lead && <p className="text-lead max-w-2xl text-ink lg:col-span-7">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
