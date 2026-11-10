import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TransitionLink } from "@/components/ui/TransitionLink";

type Variant = "primary" | "ghost" | "text";
type Size = "sm" | "md" | "lg";

const base =
  "tap-press group/btn inline-flex items-center justify-center gap-3 whitespace-nowrap font-sans font-medium uppercase tracking-[0.08em] transition-[background-color,color,border-color,transform] duration-500 ease-expo-out";

const variants: Record<Variant, string> = {
  // S'inverse automatiquement selon le thème de section (fond = encre, texte = surface).
  primary: "bg-ink text-surface hover:bg-accent-ink",
  ghost: "border border-line-strong text-ink hover:border-ink",
  text: "text-ink underline decoration-line-strong underline-offset-[0.4em] hover:decoration-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-10 rounded-full px-4 text-[0.6875rem]",
  md: "h-12 rounded-full px-6 text-xs",
  lg: "h-16 rounded-full px-8 text-sm",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  /** Point incandescent : réservé au bouton d'action principal (accent très rare). */
  glow?: boolean;
  arrow?: boolean;
  className?: string;
  glowClassName?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  glow,
  arrow,
  className,
  glowClassName,
}: Props) {
  return (
    <TransitionLink
      href={href}
      className={cn(base, variants[variant], variant !== "text" && sizes[size], className)}
    >
      {glow && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-incandescent shadow-[0_0_10px_2px_rgb(255_91_31/0.65)]",
            glowClassName,
          )}
        />
      )}
      <span>{children}</span>
      {arrow && (
        <span
          aria-hidden="true"
          className="transition-transform duration-500 ease-expo-out group-hover/btn:translate-x-1"
        >
          →
        </span>
      )}
    </TransitionLink>
  );
}
