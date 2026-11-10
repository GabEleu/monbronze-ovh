import { site } from "@/content/site";

export function SkipLink() {
  return (
    <a
      href="#contenu"
      className="label-mono fixed top-3 left-3 z-[100] -translate-y-24 rounded-full bg-ivoire px-5 py-3 text-charbon transition-transform focus:translate-y-0"
    >
      {site.a11y.skip}
    </a>
  );
}
