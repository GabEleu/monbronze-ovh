import type { Metadata } from "next";

type PageSeo = {
  title: string;
  description: string;
  /** Chemin canonique, ex. "/concept". */
  path: string;
  /** Titre complet, sans le suffixe « · monbronze.fr ». */
  absoluteTitle?: boolean;
  noindex?: boolean;
  /** Image de partage propre à la page (sinon : opengraph-image du segment, ou celle par défaut). */
  image?: { url: string; width: number; height: number; alt: string };
};

/** Image de partage par défaut (app/opengraph-image.tsx, générée au build). */
const DEFAULT_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "monbronze.fr : la fonderie d'art accessible au plus grand nombre",
};

/** Métadonnées uniques par page : titre, description, URL canonique, partage. */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle,
  noindex,
  image,
}: PageSeo): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "monbronze.fr",
      locale: "fr_FR",
      type: "website",
      images: [image ?? DEFAULT_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [(image ?? DEFAULT_IMAGE).url] },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
  };
}
