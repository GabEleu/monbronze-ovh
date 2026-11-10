"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useCalmMode } from "@/lib/preferences";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Phrase révélée ligne par ligne au défilement (BRIEF.md §3.6, typographie animée) :
 * la couleur passe du bronze à l'encre, comme du métal qui refroidit. Aucun effet en mouvement réduit ou « Expérience allégée ». Le texte reste du
 * HTML lisible sans JavaScript ; l'animation dure moins de 1,2 s.
 */
export function CoolingText({
  children,
  className,
  as: Tag = "p",
}: {
  children: string;
  className?: string;
  as?: "p" | "h2" | "h3";
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const calm = useCalmMode();

  useGSAP(
    () => {
      const el = ref.current;
      if (calm || !el) return;
      const ink = getComputedStyle(el).color;
      // Lignes en <span> sans ARIA : la phrase reste lue d'un seul tenant. La graisse ne
      // change pas (les lignes découpées ne doivent pas changer de largeur).
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        tag: "span",
        aria: "none",
        autoSplit: true,
        onSplit(self) {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
          tl.from(self.lines, { yPercent: 110, duration: 0.85, ease: "expo.out", stagger: 0.06 });
          tl.fromTo(
            el,
            { color: "#8a5a32" },
            { color: ink, duration: 1, ease: "power3.out", clearProps: "color" },
            0.1,
          );
          return tl;
        },
      });
    },
    { dependencies: [calm], scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
