"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { CONTACT_EMAIL, site } from "@/content/site";
import { cn } from "@/lib/cn";
import { pad } from "@/components/ui/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { getLenis } from "@/components/layout/Experience";

/** États de la sculpture montrés derrière chaque lien du menu (images fixes du rendu). */
const STATES = ["points", "filaire", "cire", "bronze", "bronze"] as const;

/**
 * Menu plein écran (tous écrans) : grands liens en serif ; au survol ou au focus de chaque
 * lien, la sculpture en arrière-plan change d'état (points, filaire, cire, bronze).
 * <dialog> natif : piège du focus, Échap, arrière-plan inerte.
 */
export function MobileMenu({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(3);

  // Ferme le menu après une navigation.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      dialogRef.current?.close();
    }
  }, [pathname]);

  const show = () => {
    dialogRef.current?.showModal();
    getLenis()?.stop();
    setOpen(true);
  };

  const onClose = () => {
    getLenis()?.start();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="label-mono inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line-strong px-4 text-[0.6875rem] text-ink transition-colors hover:border-ink max-sm:size-11 max-sm:px-0"
      >
        <span aria-hidden="true" className="flex w-3.5 flex-col gap-[3px]">
          <span className="h-px w-full bg-current" />
          <span className="h-px w-full bg-current" />
        </span>
        <span className="max-sm:sr-only">{site.a11y.menuOpen}</span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        aria-label={site.a11y.menuLabel}
        className="theme-dark m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-charbon p-0 text-ink backdrop:bg-charbon/80"
      >
        <div aria-hidden="true" className="menu-states">
          {["points", "filaire", "cire", "bronze"].map((name) => (
            <Image
              key={name}
              src={`/images/etats/${name}.webp`}
              alt=""
              width={600}
              height={1000}
              sizes="40vw"
              data-active={STATES[state] === name ? "" : undefined}
            />
          ))}
        </div>
        <div className="container-page relative flex min-h-full flex-col pb-10">
          <div className="flex h-[var(--header-h)] items-center justify-between">
            <span className="label-mono text-ink-muted">{site.a11y.menuLabel}</span>
            <form method="dialog">
              <button
                type="submit"
                className="label-mono inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-[0.6875rem] text-ink hover:border-ink"
              >
                <span aria-hidden="true" className="text-sm leading-none">
                  ×
                </span>
                {site.a11y.menuClose}
              </button>
            </form>
          </div>

          <nav aria-label={site.a11y.mainNav} className="mt-6 flex-1">
            <ul className="border-t border-line">
              {site.nav.map((item, i) => {
                const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href} className="border-b border-line">
                    <TransitionLink
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      onPointerEnter={() => setState(i)}
                      onFocus={() => setState(i)}
                      className="group/item flex items-baseline gap-5 py-5"
                    >
                      <span className="label-mono w-6 text-ink-muted">{pad(i + 1)}</span>
                      <span
                        className={cn(
                          "font-serif text-[clamp(2rem,9vw,3.5rem)] leading-none tracking-[-0.02em] transition-colors",
                          current
                            ? "text-or underline decoration-1 underline-offset-[0.18em]"
                            : "text-ink group-hover/item:text-or",
                        )}
                      >
                        {item.label}
                      </span>
                    </TransitionLink>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-10 flex flex-col gap-6">
            <div className="sm:hidden">
              <SoundToggle />
            </div>
            <ButtonLink href={site.cta.project.href} glow size="lg" className="w-full">
              {site.cta.project.label}
            </ButtonLink>
            <TransitionLink
              href={`mailto:${CONTACT_EMAIL}`}
              className="label-mono text-center text-ink-muted hover:text-ink"
            >
              {CONTACT_EMAIL}
            </TransitionLink>
          </div>
        </div>
      </dialog>
    </>
  );
}
