import Link from "next/link";
import type { ComponentProps } from "react";
import { site } from "@/content/site";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  /** Sans rideau de métal (ex. cartes de la galerie : l'image s'ouvre par une View Transition). */
  plain?: boolean;
};

/**
 * Point de passage unique de TOUS les liens du site (composant serveur, aucun coût
 * d'hydratation). Le rideau « métal liquide » est joué par UN écouteur global
 * (components/layout/PageTransition) ; `plain` l'évite pour un lien.
 * Les liens externes s'ouvrent dans un nouvel onglet.
 */
export function TransitionLink({ href, children, plain, ...props }: Props) {
  const external = /^https?:\/\//.test(href);
  const special = /^(mailto|tel):/.test(href);

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
        <span className="sr-only"> {site.a11y.external}</span>
      </a>
    );
  }
  if (special || href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} data-plain={plain ? "" : undefined} {...props}>
      {children}
    </Link>
  );
}
