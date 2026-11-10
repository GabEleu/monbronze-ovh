import { site } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LabStage } from "@/components/lab/LabStage";

// Page interne, non indexée (robots.txt + meta noindex).
export const metadata = pageMetadata({ ...site.seo.lab, path: "/lab", noindex: true });

export default function LabPage() {
  const t = site.lab;
  return (
    <>
      <header className="container-page flex flex-col gap-3 py-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h1 className="text-h2 mt-3">{t.title}</h1>
        </div>
        <p className="max-w-md text-sm text-ink-muted">{t.text}</p>
      </header>
      <LabStage />
    </>
  );
}
