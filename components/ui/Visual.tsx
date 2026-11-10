import Image from "next/image";
import { assets, type AssetId, type Patine, type VisualAsset } from "@/content/assets";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { frTypo } from "@/lib/fr";
import { AtelierVideo } from "@/components/ui/AtelierVideo";

type Ratio = "portrait" | "tall" | "square" | "landscape" | "wide" | "step";

type Props = {
  /** Visuel déclaré dans content/assets.ts… */
  id?: AssetId;
  /** …ou visuel fourni directement (contenu modifiable depuis /admin). */
  asset?: VisualAsset;
  ratio?: Ratio;
  /** Force une patine (configurateur). */
  patine?: Patine;
  labels?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Affiche un visuel référencé dans `content/assets.ts`.
 * - kind "image" : vraie image (next/image) avec son texte alternatif.
 * - kind "placeholder" : échantillon de matière en CSS, purement décoratif
 *   (aria-hidden), en attendant les rendus 3D (phase 1 et suivantes).
 */
export function Visual({
  id,
  asset: given,
  ratio = "portrait",
  patine,
  labels = true,
  className,
  sizes,
  priority,
}: Props) {
  const asset = given ?? assets[id!];
  const ratioClass = `visual--${ratio}`;

  if (asset.kind === "image") {
    return (
      <div className={cn("visual", ratioClass, className)}>
        <Image
          src={asset.src}
          alt={asset.alt}
          width={asset.width}
          height={asset.height}
          sizes={sizes ?? "(min-width: 1024px) 50vw, 100vw"}
          priority={priority}
          // Médias envoyés depuis /admin : déjà redimensionnés et convertis en WebP à l'envoi.
          unoptimized={asset.src.startsWith("/media/")}
          className="absolute inset-0 size-full object-cover"
        />
        {asset.video && (
          <AtelierVideo src={asset.video.src} poster={asset.video.poster} label={asset.alt} />
        )}
        {asset.legend && labels && (
          <span className="visual__legend label-mono">
            {site.realisations.render} {asset.legend}
          </span>
        )}
        {asset.pending && <span className="visual__badge label-mono">{site.visual.pending}</span>}
      </div>
    );
  }

  const p = patine ?? asset.patine;
  const stateLabel = site.visual.states[asset.state];
  const patineLabel = p ? site.patines.find((x) => x.id === p)?.label : undefined;

  return (
    <div
      aria-hidden="true"
      className={cn("visual", ratioClass, className)}
      data-state={asset.state}
      data-patine={p}
    >
      <div className="visual__floor" />
      <div className="visual__sample" />
      <div className="visual__marks" />
      {labels && (
        <>
          <span className="visual__label visual__label--tl label-mono">
            {frTypo(asset.subject)}
          </span>
          <span className="visual__label visual__label--tr label-mono">
            {stateLabel}
            {patineLabel && ` · ${patineLabel}`}
          </span>
          <span className="visual__label visual__label--bl label-mono">
            {site.visual.provisional}
          </span>
        </>
      )}
    </div>
  );
}
