import { PageHero } from "@/components/sections/PageHero";

type LegalSection = { title: string; paragraphs: readonly string[]; list?: readonly string[] };

/** Gabarit des pages légales : sections numérotées, lecture confortable sur fond ivoire. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: readonly LegalSection[];
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title}>
        <p className="label-mono text-ink-muted lg:col-span-12">{updated}</p>
      </PageHero>
      <div className="theme-light section">
        <div className="container-page grid lg:grid-cols-12">
          <div className="flex flex-col lg:col-span-8 lg:col-start-3">
            {sections.map((s, i) => (
              <section
                key={s.title}
                aria-labelledby={`s-${i}`}
                className="grid gap-4 border-t border-line py-10 md:grid-cols-[4rem_1fr]"
              >
                <span className="label-mono pt-1.5 text-ink-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-4">
                  <h2 id={`s-${i}`} className="text-h3">
                    {s.title}
                  </h2>
                  {s.paragraphs.map((p) => (
                    <p key={p} className="max-w-2xl text-ink">
                      {p}
                    </p>
                  ))}
                  {s.list && (
                    <ul className="flex max-w-2xl flex-col gap-2">
                      {s.list.map((item) => (
                        <li key={item} className="flex gap-3 text-ink">
                          <span
                            aria-hidden="true"
                            className="mt-[0.7em] h-px w-3 shrink-0 bg-bronze"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
