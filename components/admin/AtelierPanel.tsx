"use client";

import { useState } from "react";
import { admin } from "@/content/admin";
import { adminApi } from "@/lib/admin/client";
import type { AtelierContent } from "@/lib/content/schemas";
import {
  Field,
  ImageField,
  inputClass,
  pillClass,
  VideoField,
  type MediaImage,
} from "@/components/admin/fields";
import { SaveStatus, useDirty, useErrorMessages } from "@/components/admin/context";

type Saved = AtelierContent["gestures"][number];
/** Geste en cours de saisie : un geste ajouté n'a pas encore de photo. */
type Gesture = Omit<Saved, "image"> & { image: MediaImage | null };

const pad = (n: number) => String(n).padStart(2, "0");

/** Les gestes de l'atelier (accueil, section 4) : titres, textes, photos, vidéos, ordre. */
export function AtelierPanel({
  initial,
  onSaved,
}: {
  initial: AtelierContent;
  onSaved: () => Promise<void>;
}) {
  const t = admin.atelier;
  const [gestures, setGestures] = useState<Gesture[]>(() => structuredClone(initial.gestures));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial.gestures));
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const describe = useErrorMessages();
  useDirty("atelier", JSON.stringify(gestures) !== baseline);

  const update = (i: number, patch: Partial<Gesture>) => {
    setOk("");
    setGestures((list) => list.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  };
  const move = (i: number, delta: number) =>
    setGestures((list) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(i + delta, 0, item!);
      return next;
    });

  const save = async () => {
    setOk("");
    const missing = gestures
      .map((g, i) => (g.image ? null : `${t.gesture} ${pad(i + 1)} : ${t.needImage}.`))
      .filter((m): m is string => Boolean(m));
    if (missing.length) {
      setErrors(missing);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      await adminApi("PUT", "/api/admin/content", { kind: "atelier", data: { gestures } });
      await onSaved();
      setBaseline(JSON.stringify(gestures));
      setOk(admin.common.saved);
    } catch (e) {
      setErrors(describe(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex max-w-3xl flex-col gap-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <p className="text-ink-muted">{t.intro}</p>
      {gestures.map((g, i) => (
        <fieldset key={i} className="flex flex-col gap-4 border-t border-line pt-6">
          <legend className="label-mono text-ink-muted">
            {t.gesture} {pad(i + 1)}
          </legend>
          <Field label={t.title}>
            {(p) => (
              <input
                {...p}
                className={inputClass}
                required
                maxLength={120}
                value={g.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
            )}
          </Field>
          <Field label={t.text}>
            {(p) => (
              <textarea
                {...p}
                className={inputClass}
                required
                rows={3}
                maxLength={600}
                value={g.text}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            )}
          </Field>
          <ImageField label={t.image} value={g.image} onChange={(image) => update(i, { image })} />
          <VideoField
            value={g.video ?? null}
            onChange={(video) => update(i, { video: video ?? undefined })}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className={pillClass}
            >
              {admin.common.up}
            </button>
            <button
              type="button"
              disabled={i === gestures.length - 1}
              onClick={() => move(i, 1)}
              className={pillClass}
            >
              {admin.common.down}
            </button>
            <button
              type="button"
              disabled={gestures.length <= 1}
              onClick={() => setGestures((list) => list.filter((_, j) => j !== i))}
              className={pillClass}
            >
              {admin.common.remove}
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={gestures.length >= 12}
        onClick={() => setGestures((list) => [...list, { title: "", text: "", image: null }])}
        className={`${pillClass} self-start`}
      >
        {t.add}
      </button>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <SaveStatus messages={errors} ok={ok} />
        <button
          type="submit"
          disabled={saving}
          className="label-mono min-h-10 self-start rounded-full bg-ink px-6 py-3 text-surface"
        >
          {saving ? admin.common.saving : admin.common.save}
        </button>
      </div>
    </form>
  );
}
