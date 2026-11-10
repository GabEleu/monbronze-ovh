import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/home/Hero";
import { Truths } from "@/components/sections/home/Truths";
import { Possibilities } from "@/components/sections/home/Possibilities";
import { Ateliers } from "@/components/sections/home/Ateliers";
import { Metamorphose } from "@/components/sections/home/Metamorphose";
import { Selection } from "@/components/sections/home/Selection";
import { Team } from "@/components/sections/home/Team";
import { FinalCta } from "@/components/sections/FinalCta";
import { getAtelier } from "@/lib/content/editable";

export const metadata = pageMetadata({
  ...site.seo.default,
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  // Ateliers : contenu modifiable dans l'espace d'administration.
  const atelier = await getAtelier();
  return (
    <>
      <Hero />
      <Truths />
      <Possibilities />
      <Ateliers gestures={atelier.gestures} />
      <Metamorphose />
      <Selection />
      <Team />
      <FinalCta index={8} />
    </>
  );
}
