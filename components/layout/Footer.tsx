import { A_COMPLETER, CONTACT_EMAIL, site } from "@/content/site";
import { getPages } from "@/lib/content/editable";
import { frTypo } from "@/lib/fr";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { Preferences } from "@/components/layout/Preferences";
import { Wordmark } from "@/components/layout/Wordmark";

const linkClass = "text-sm text-ink transition-colors hover:text-or";

export async function Footer() {
  const t = site.footer;
  // Coordonnées saisies dans l'espace d'administration ; vides : « [À COMPLÉTER] ».
  const { coordonnees } = await getPages();
  const line = (label: string, value: string) => frTypo(`${label} : ${value || A_COMPLETER}`);
  return (
    <footer className="theme-dark relative border-t border-line">
      <div className="container-page grid gap-14 py-16 md:grid-cols-12 md:gap-8 md:py-24">
        <div className="flex flex-col gap-6 md:col-span-12 lg:col-span-4">
          <Wordmark />
          <p className="max-w-sm font-serif text-2xl leading-tight text-ink [font-variation-settings:'SOFT'_30,'opsz'_48]">
            {site.brand.baseline}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">{site.brand.signature}</p>
        </div>

        <nav aria-label={site.a11y.footerNav} className="md:col-span-4 lg:col-span-2">
          <h2 className="label-mono mb-5 font-mono text-ink-muted">{t.navTitle}</h2>
          <ul className="flex flex-col gap-3">
            <li>
              <TransitionLink href="/" className={linkClass}>
                {t.home}
              </TransitionLink>
            </li>
            {site.nav.map((item) => (
              <li key={item.href}>
                <TransitionLink href={item.href} className={linkClass}>
                  {item.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4 lg:col-span-3">
          <h2 className="label-mono mb-5 font-mono text-ink-muted">{t.contactTitle}</h2>
          <address className="flex flex-col gap-3 not-italic">
            <TransitionLink href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </TransitionLink>
            <span className="text-sm text-ink-muted">{t.location}</span>
            <span className="text-sm text-ink-muted">
              {line(t.addressLabel, coordonnees.adresse)}
            </span>
            <span className="text-sm text-ink-muted">
              {line(t.phoneLabel, coordonnees.telephone)}
            </span>
          </address>
          <h2 className="label-mono mt-10 mb-5 font-mono text-ink-muted">{t.legalTitle}</h2>
          <ul className="flex flex-col gap-3">
            {site.legalNav.map((item) => (
              <li key={item.href}>
                <TransitionLink href={item.href} className={linkClass}>
                  {item.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4 lg:col-span-3">
          <h2 className="label-mono mb-2 font-mono text-ink-muted">{t.prefsTitle}</h2>
          <Preferences />
        </div>
      </div>

      <div className="container-page flex flex-col gap-2 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="label-mono text-ink-muted">{t.copyright}</p>
        <p className="label-mono text-ink-muted">{t.location}</p>
      </div>
    </footer>
  );
}
