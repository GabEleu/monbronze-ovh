"use client";

import { useId } from "react";
import type { Patine } from "@/content/assets";
import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const SWATCH: Record<Patine, string> = {
  "brun-medaille": "radial-gradient(circle at 35% 30%, #e8c08a, #8f5a33 45%, #2b180c)",
  "vert-de-gris": "radial-gradient(circle at 35% 30%, #cfe0d4, #4f7f6f 45%, #14231d)",
  noir: "radial-gradient(circle at 35% 30%, #a89c90, #2f2a26 45%, #0b0a09)",
  dore: "radial-gradient(circle at 35% 30%, #fff0c4, #c49a4a 45%, #46300f)",
};

type SwatchProps = {
  patine: Patine;
  onChange: (patine: Patine) => void;
  className?: string;
};

/**
 * Choix de la patine. Deux présentations du même choix, une seule visible à la fois :
 * - grand écran : pastilles en pilules dans la colonne du configurateur ;
 * - téléphone et tablette (`compact`) : une rangée de quatre pastilles juste sous la
 *   sculpture, pour voir le résultat sans faire défiler entre le choix et la pièce.
 */
export function PatinaSwatches({
  patine,
  onChange,
  compact = false,
  className,
}: SwatchProps & { compact?: boolean }) {
  const t = site.home.possibilities.configurator;
  const name = useId();

  return (
    <fieldset className={className}>
      {/* Compact : légende lue par les lecteurs d'écran seulement (les noms suffisent à
          l'œil, et la rangée tient sous la sculpture dans le même écran). */}
      <legend className={compact ? "sr-only" : "label-mono mb-4 text-ink-muted"}>{t.legend}</legend>
      <div className={compact ? "grid grid-cols-4 gap-2" : "grid grid-cols-2 gap-3 sm:max-w-md"}>
        {site.patines.map((p) => (
          <label
            key={p.id}
            className={cn(
              "group/sw cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-or",
              compact
                ? "tap-press flex flex-col items-center gap-2 rounded-2xl px-1 py-2 text-center"
                : "flex items-center gap-3 rounded-full border border-line px-3 py-2.5 transition-colors hover:border-line-strong has-checked:border-or",
            )}
          >
            <input
              type="radio"
              name={name}
              value={p.id}
              checked={patine === p.id}
              onChange={() => onChange(p.id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                "shrink-0 rounded-full ring-1 ring-line-strong",
                compact
                  ? "size-11 ring-offset-2 ring-offset-surface transition-[box-shadow,scale] group-has-checked/sw:scale-110 group-has-checked/sw:ring-2 group-has-checked/sw:ring-or"
                  : "size-7",
              )}
              style={{ background: SWATCH[p.id] }}
            />
            <span className={compact ? "text-xs leading-tight text-ink" : "text-sm text-ink"}>
              {p.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Configurateur de patine (BRIEF.md §6.1-3) : la patine choisie s'applique en temps réel
 * à la sculpture 3D de la section (ou à l'échantillon statique sans WebGL), puis invite à
 * « Créer mon projet » avec la patine en paramètre. Sous 1024 px, le choix lui-même est
 * posé sous la sculpture (`PatinaSwatches compact`, dans Possibilities).
 */
export function PatinaConfigurator({ patine, onChange }: SwatchProps) {
  const t = site.home.possibilities.configurator;
  const current = site.patines.find((p) => p.id === patine);

  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-h2 font-serif">{t.title}</h3>
      <p className="text-lead max-w-md text-ink-muted">{t.text}</p>

      <PatinaSwatches patine={patine} onChange={onChange} className="max-lg:hidden" />

      <p className="label-mono text-ink-muted">
        {t.current}&nbsp;: <span className="text-ink">{current?.label}</span>
      </p>

      <div>
        <ButtonLink href={`${site.cta.create.href}?patine=${patine}`} glow size="lg">
          {site.cta.create.label}
        </ButtonLink>
      </div>
    </div>
  );
}
