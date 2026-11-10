"use client";

import { site } from "@/content/site";
import { setPreferences, usePreferences } from "@/lib/preferences";

/** Bouton « Son » toujours visible (BRIEF.md §3.6) : coupé par défaut. */
export function SoundToggle() {
  const { sound } = usePreferences();
  return (
    <button
      type="button"
      aria-pressed={sound}
      onClick={() => setPreferences({ sound: !sound })}
      className="label-mono inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-[0.6875rem] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0.5, 1, 0.7].map((h, i) => (
          <span
            key={i}
            className={`w-[2px] bg-current ${sound ? "sound-bar" : ""}`}
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="max-sm:sr-only">{site.footer.sound.label}</span>
    </button>
  );
}
