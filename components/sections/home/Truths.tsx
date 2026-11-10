import { site } from "@/content/site";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow, pad } from "@/components/ui/Eyebrow";
import { CoolingText } from "@/components/ui/CoolingText";

export function Truths() {
  const t = site.home.truths;
  return (
    <section id={t.id} aria-labelledby="truths-title" className="theme-light section">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:col-span-4 lg:self-start">
          <Eyebrow index={2} total={8}>
            {t.eyebrow}
          </Eyebrow>
          <h2 id="truths-title" className="text-h2 mt-6 max-w-[12ch]">
            {t.title}
          </h2>
        </div>

        <ol className="lg:col-span-8 lg:col-start-5">
          {t.items.map((item, i) => (
            <li
              key={item}
              className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line py-8 last:border-b md:grid-cols-[4rem_1fr] md:py-11"
            >
              <span className="label-mono pt-2 text-ink-muted md:pt-4">{pad(i + 1)}</span>
              <CoolingText className="font-serif text-[clamp(1.75rem,3.7vw,3.75rem)] leading-[1.04] tracking-[-0.012em] [font-variation-settings:'SOFT'_0,'opsz'_144] [word-spacing:0.04em]">
                {item}
              </CoolingText>
            </li>
          ))}
        </ol>

        <div className="lg:col-span-8 lg:col-start-5">
          <ButtonLink href={t.link.href} variant="text" arrow>
            {t.link.label}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
