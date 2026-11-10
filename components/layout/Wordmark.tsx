import { site } from "@/content/site";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { cn } from "@/lib/cn";

/** Logotype texte. `compact` : version de l'en-tête, resserrée sur petit écran. */
export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <TransitionLink
      href="/"
      aria-label={site.a11y.home}
      className={cn("group/wm inline-flex min-w-0 items-baseline gap-0.5 leading-none", className)}
    >
      <span
        className={cn(
          "font-serif tracking-[-0.03em] [font-variation-settings:'SOFT'_50,'opsz'_48]",
          compact ? "text-[1.1875rem] sm:text-[1.375rem]" : "text-[1.375rem]",
        )}
      >
        {site.brand.name}
      </span>
      <span
        className={cn(
          "font-mono text-[0.6875rem] text-ink-muted transition-colors group-hover/wm:text-incandescent",
          compact && "max-[419px]:hidden",
        )}
      >
        {site.brand.tld}
      </span>
    </TransitionLink>
  );
}
