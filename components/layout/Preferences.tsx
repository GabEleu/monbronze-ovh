"use client";

import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { setPreferences, usePreferences } from "@/lib/preferences";

function Switch({
  label,
  hint,
  checked,
  onLabel,
  offLabel,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group/sw flex w-full items-center justify-between gap-6 border-b border-line py-3 text-left"
    >
      <span className="flex flex-col">
        <span className="text-sm text-ink">{label}</span>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </span>
      <span className="flex items-center gap-3">
        <span className="label-mono text-[0.625rem] text-ink-muted">
          {checked ? onLabel : offLabel}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-5 w-9 rounded-full border transition-colors duration-300",
            checked ? "border-or bg-or/20" : "border-line-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-1/2 left-0.5 size-3.5 -translate-y-1/2 rounded-full transition-transform duration-300 ease-expo-out",
              checked ? "translate-x-4 bg-or" : "bg-pierre",
            )}
          />
        </span>
      </span>
    </button>
  );
}

/** Interrupteurs « Expérience allégée » et « Son » (pied de page). */
export function Preferences() {
  const { lite, sound } = usePreferences();
  const t = site.footer;
  return (
    <div className="flex flex-col">
      <Switch
        label={t.lite.label}
        hint={t.lite.hint}
        checked={lite}
        onLabel={t.lite.on}
        offLabel={t.lite.off}
        onChange={(v) => setPreferences({ lite: v })}
      />
      <Switch
        label={t.sound.label}
        checked={sound}
        onLabel={t.sound.on}
        offLabel={t.sound.off}
        onChange={(v) => setPreferences({ sound: v })}
      />
    </div>
  );
}
