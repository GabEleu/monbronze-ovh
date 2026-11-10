"use client";

import { usePathname } from "next/navigation";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { Wordmark } from "@/components/layout/Wordmark";
import { SoundToggle } from "@/components/layout/SoundToggle";

export function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="theme-dark fixed inset-x-0 top-0 z-50 border-b border-line bg-charbon/85 backdrop-blur-md">
      <div className="container-page flex h-[var(--header-h)] items-center justify-between gap-3 sm:gap-4">
        <Wordmark compact />

        <nav aria-label={site.a11y.mainNav} className="hidden lg:block">
          <ul className="flex items-center gap-7 xl:gap-9">
            {site.nav.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <TransitionLink
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative py-2 text-[0.75rem] font-medium tracking-[0.08em] uppercase transition-colors duration-300",
                      current ? "text-ink" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-or transition-transform duration-500 ease-expo-out",
                        current ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </TransitionLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="max-sm:hidden">
            <SoundToggle />
          </div>
          <ButtonLink
            href={site.cta.project.href}
            glow
            size="sm"
            className="max-sm:h-11 max-sm:gap-2 max-sm:px-3 max-sm:text-[0.625rem] max-sm:tracking-[0.04em]"
            glowClassName="max-[419px]:hidden"
          >
            {site.cta.project.label}
          </ButtonLink>
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
