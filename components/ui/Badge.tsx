import { cn } from "@/lib/cn";
import { site } from "@/content/site";

/** Badge obligatoire sur toute réalisation de type « illustratif » (règle d'honnêteté). */
export function IllustrativeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "label-mono inline-flex items-center gap-2 rounded-full border border-ivoire/40 bg-charbon/80 px-3 py-1.5 text-[0.625rem] text-ivoire backdrop-blur-sm",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1 rounded-full bg-or" />
      {site.realisations.badge}
    </span>
  );
}

/** Pastille d'étape de fabrication (CAPTURER, MODÉLISER…). */
export function StepPill({ index, label }: { index: number; label: string }) {
  return (
    <span className="label-mono inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-[0.625rem] text-ink">
      <span className="text-ink-muted">{String(index).padStart(2, "0")}</span>
      {label}
    </span>
  );
}
