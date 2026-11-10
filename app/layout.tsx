import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, site } from "@/content/site";
import { Experience } from "@/components/layout/Experience";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { WebGLMount } from "@/components/layout/WebGLMount";
import { Cursor } from "@/components/layout/Cursor";
import { PageTransition } from "@/components/layout/PageTransition";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import "./globals.css";
import "./visual.css";

// Tout le site est généré statiquement : toute donnée « à la requête » fait échouer le build.
export const ensureStatic = "navigation";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.seo.default.title,
    template: "%s · monbronze.fr",
  },
  description: site.seo.default.description,
  applicationName: "monbronze.fr",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: "monbronze.fr",
    locale: "fr_FR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0d0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-experience="full"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="theme-dark">
        {/* Sans JavaScript : visuels statiques de l'accueil (aucun canvas ne les remplacera). */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: "<style>.hero .hero-pour,.hero .hero-bust{opacity:1}</style>",
          }}
        />
        <OrganizationJsonLd />
        <SkipLink />
        <Experience />
        {/* Canvas WebGL persistant : derrière le DOM, aria-hidden, chargé après le premier affichage. */}
        <WebGLMount />
        <Header />
        <main id="contenu" tabIndex={-1} className="pt-[var(--header-h)]">
          {children}
        </main>
        <Footer />
        <PageTransition />
        <Cursor />
        <div aria-hidden="true" className="grain" />
      </body>
    </html>
  );
}
