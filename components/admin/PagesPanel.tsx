"use client";

import { useState } from "react";
import { admin } from "@/content/admin";
import { adminApi } from "@/lib/admin/client";
import type { PagesContent } from "@/lib/content/schemas";
import { Field, inputClass } from "@/components/admin/fields";
import { SaveStatus, useDirty, useErrorMessages } from "@/components/admin/context";

type LegalKey = "mentions" | "confidentialite";
/** Section en cours de saisie : paragraphes et liste gardés en texte brut jusqu'à l'envoi. */
type DraftSection = { title: string; text: string; listText: string };
type DraftLegal = { updated: string; sections: DraftSection[] };
type Draft = {
  coordonnees: PagesContent["coordonnees"];
  mentions: DraftLegal;
  confidentialite: DraftLegal;
};

const NL = "\n";
/** Paragraphes ⇄ zone de texte (une ligne vide entre deux paragraphes). */
const toParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
const toLines = (text: string) =>
  text
    .split(NL)
    .map((l) => l.trim())
    .filter(Boolean);

function toDraft(p: PagesContent["mentions"]): DraftLegal {
  return {
    updated: p.updated,
    sections: p.sections.map((s) => ({
      title: s.title,
      text: s.paragraphs.join(NL + NL),
      listText: (s.list ?? []).join(NL),
    })),
  };
}

function fromDraft(p: DraftLegal): PagesContent["mentions"] {
  return {
    updated: p.updated,
    sections: p.sections.map((s) => {
      const list = toLines(s.listText);
      return { title: s.title, paragraphs: toParagraphs(s.text), ...(list.length ? { list } : {}) };
    }),
  };
}

/** Coordonnées du pied de page et pages légales (mentions, confidentialité). */
export function PagesPanel({
  initial,
  onSaved,
}: {
  initial: PagesContent;
  onSaved: () => Promise<void>;
}) {
  const t = admin.pages;
  const [pages, setPages] = useState<Draft>(() => ({
    coordonnees: { ...initial.coordonnees },
    mentions: toDraft(initial.mentions),
    confidentialite: toDraft(initial.confidentialite),
  }));
  const [baseline, setBaseline] = useState(() => JSON.stringify(pages));
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const describe = useErrorMessages();
  useDirty("pages", JSON.stringify(pages) !== baseline);

  const setLegal = (key: LegalKey, patch: Partial<DraftLegal>) =>
    setPages((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setSection = (key: LegalKey, i: number, patch: Partial<DraftSection>) =>
    setPages((p) => ({
      ...p,
      [key]: {
        ...p[key],
        sections: p[key].sections.map((s, j) => (j === i ? { ...s, ...patch } : s)),
      },
    }));

  const save = async () => {
    setSaving(true);
    setErrors([]);
    setOk("");
    try {
      const data: PagesContent = {
        coordonnees: pages.coordonnees,
        mentions: fromDraft(pages.mentions),
        confidentialite: fromDraft(pages.confidentialite),
      };
      await adminApi("PUT", "/api/admin/content", { kind: "pages", data });
      await onSaved();
      setBaseline(JSON.stringify(pages));
      setOk(admin.common.saved);
    } catch (e) {
      setErrors(describe(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex max-w-3xl flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-serif text-2xl text-ink">{t.coordonnees}</legend>
        <p className="text-xs text-ink-muted">{t.emptyHint}</p>
        <Field label={t.adresse}>
          {(p) => (
            <input
              {...p}
              className={inputClass}
              maxLength={300}
              autoComplete="street-address"
              value={pages.coordonnees.adresse}
              onChange={(e) =>
                setPages((x) => ({
                  ...x,
                  coordonnees: { ...x.coordonnees, adresse: e.target.value },
                }))
              }
            />
          )}
        </Field>
        <Field label={t.telephone}>
          {(p) => (
            <input
              {...p}
              className={inputClass}
              maxLength={40}
              type="tel"
              value={pages.coordonnees.telephone}
              onChange={(e) =>
                setPages((x) => ({
                  ...x,
                  coordonnees: { ...x.coordonnees, telephone: e.target.value },
                }))
              }
            />
          )}
        </Field>
      </fieldset>

      {(["mentions", "confidentialite"] as const).map((key) => (
        <fieldset key={key} className="flex flex-col gap-6 border-t border-line pt-8">
          <legend className="mb-2 font-serif text-2xl text-ink">
            {key === "mentions" ? t.mentions : t.confidentialite}
          </legend>
          <Field label={t.updated}>
            {(p) => (
              <input
                {...p}
                className={inputClass}
                required
                maxLength={120}
                value={pages[key].updated}
                onChange={(e) => setLegal(key, { updated: e.target.value })}
              />
            )}
          </Field>
          {pages[key].sections.map((s, i) => (
            <fieldset key={i} className="flex flex-col gap-3 rounded-md border border-line p-4">
              <legend className="label-mono px-1 text-ink-muted">
                {t.section} {i + 1}
              </legend>
              <Field label={t.sectionTitle}>
                {(p) => (
                  <input
                    {...p}
                    className={inputClass}
                    required
                    maxLength={150}
                    value={s.title}
                    onChange={(e) => setSection(key, i, { title: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t.paragraphs}>
                {(p) => (
                  <textarea
                    {...p}
                    className={inputClass}
                    required
                    rows={Math.min(14, 3 + s.text.split(NL).length)}
                    value={s.text}
                    onChange={(e) => setSection(key, i, { text: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t.list}>
                {(p) => (
                  <textarea
                    {...p}
                    className={inputClass}
                    rows={3}
                    value={s.listText}
                    onChange={(e) => setSection(key, i, { listText: e.target.value })}
                  />
                )}
              </Field>
              <button
                type="button"
                disabled={pages[key].sections.length <= 1}
                onClick={() =>
                  setLegal(key, { sections: pages[key].sections.filter((_, j) => j !== i) })
                }
                className="label-mono self-start rounded-full border border-line-strong px-4 py-2 text-ink"
              >
                {admin.common.remove}
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            onClick={() =>
              setLegal(key, {
                sections: [...pages[key].sections, { title: "", text: "", listText: "" }],
              })
            }
            className="label-mono self-start rounded-full border border-line-strong px-5 py-2 text-ink"
          >
            {t.addSection}
          </button>
        </fieldset>
      ))}

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
