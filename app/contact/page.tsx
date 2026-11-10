import { CONTACT_EMAIL, site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PageHero } from "@/components/sections/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { ContactForm } from "@/components/contact/ContactForm";

export const metadata = pageMetadata({ ...site.seo.contact, path: "/contact" });

/**
 * Contact (BRIEF.md §6.6 et §7) : formulaire conversationnel en 4 étapes, et l'écriture
 * directe par e-mail en alternative. Les clés (Vercel Blob, Turnstile) sont lues au build :
 * sans clé, le formulaire fonctionne en mode simulé.
 */
export default function ContactPage() {
  const t = site.contact;
  const [first, ...rest] = t.paragraphs;
  return (
    <>
      <PageHero eyebrow={t.eyebrow} title={t.title} lead={first}>
        <div className="flex flex-col gap-4 lg:col-span-7">
          {rest.map((p) => (
            <p key={p} className="text-ink-muted">
              {p}
            </p>
          ))}
        </div>
      </PageHero>

      <section aria-label={t.form.title} className="theme-light section">
        <div className="container-page grid gap-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <ContactForm
              uploadEnabled={Boolean(process.env.S3_BUCKET)}
              turnstileKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
            />
          </div>

          <aside className="flex flex-col gap-10 lg:col-span-4 lg:col-start-9">
            <div className="flex flex-col gap-4">
              <h2 className="label-mono text-ink-muted">{t.direct}</h2>
              <TransitionLink
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-none tracking-[-0.02em] break-all decoration-bronze decoration-1 underline-offset-[0.12em] hover:underline sm:break-normal"
              >
                {CONTACT_EMAIL}
              </TransitionLink>
            </div>
            <div className="flex flex-col gap-6">
              <h2 className="label-mono text-ink-muted">{t.prepare.title}</h2>
              <ul className="border-t border-line">
                {t.prepare.items.map((item) => (
                  <li key={item} className="border-b border-line py-3 font-serif text-2xl">
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href={t.next.href} variant="text" arrow className="self-start">
                {t.next.label}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
