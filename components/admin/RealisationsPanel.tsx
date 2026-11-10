"use client";

import { useEffect, useRef, useState } from "react";
import { assets, PATINES, type AssetId, type Patine } from "@/content/assets";
import { admin } from "@/content/admin";
import { frTypo } from "@/lib/fr";
import { adminApi, slugify } from "@/lib/admin/client";
import { isMuseumRender } from "@/lib/content/resolve";
import {
  Field,
  ImageField,
  inputClass,
  ModelField,
  pillClass,
  type MediaImage,
} from "@/components/admin/fields";
import { SaveStatus, useDirty, useErrorMessages } from "@/components/admin/context";
import type { AdminData, RawRealisation } from "@/components/admin/types";

/**
 * Nouvelle réalisation : aucune nature cochée (choix conscient), et seules les étapes que
 * toute pièce traverse (moulage-fonte, ciselure-patine) : le reste se coche s'il a eu lieu.
 */
const empty = (ordre: number): RawRealisation => ({
  slug: "",
  type: null,
  ordre,
  univers: "creation",
  titre: "",
  description: "",
  visuel: null,
  besoin: "",
  solution: "",
  etapes: ["mouler-et-fondre", "ciseler-et-patiner"],
  patine: "brun-medaille",
});

/** Aperçu du visuel actuel (visuel du site ou photo envoyée). */
function currentImage(visuel: RawRealisation["visuel"]): MediaImage | null {
  if (!visuel) return null;
  if (typeof visuel !== "string") return visuel;
  const a = assets[visuel as AssetId];
  return a?.kind === "image" ? { src: a.src, width: a.width, height: a.height, alt: a.alt } : null;
}

export function RealisationsPanel({
  data,
  onSaved,
}: {
  data: AdminData;
  onSaved: () => Promise<void>;
}) {
  const t = admin.realisations;
  const f = t.fields;
  const [draft, setDraft] = useState<RawRealisation | null>(null);
  const [baseline, setBaseline] = useState("");
  const [previousSlug, setPreviousSlug] = useState<string | undefined>();
  const [slugTouched, setSlugTouched] = useState(false);
  const [modelPending, setModelPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const photo = useRef<HTMLFieldSetElement>(null);
  const focusAfter = useRef<string | null>(null);
  const describe = useErrorMessages();
  const isNew = draft !== null && previousSlug === undefined;
  const dirty = draft !== null && JSON.stringify(draft) !== baseline;
  useDirty("realisations", dirty || modelPending);

  // Focus : sur le titre du formulaire à l'ouverture, sur le bouton d'origine à la fermeture.
  useEffect(() => {
    if (draft) heading.current?.focus();
    else if (focusAfter.current) {
      document.getElementById(focusAfter.current)?.focus();
      focusAfter.current = null;
    }
  }, [draft === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof RawRealisation>(key: K, value: RawRealisation[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const open = (r: RawRealisation | null) => {
    setErrors([]);
    setOk("");
    const next = r
      ? structuredClone(r)
      : empty(Math.max(0, ...data.realisations.map((x) => x.ordre)) + 1);
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setPreviousSlug(r?.slug);
    setSlugTouched(Boolean(r));
  };

  const close = (focusId: string) => {
    focusAfter.current = focusId;
    setDraft(null);
    setModelPending(false);
  };

  const cancel = () => {
    if ((dirty || modelPending) && !window.confirm(admin.common.confirmLeave)) return;
    close(previousSlug ? `modifier-${previousSlug}` : "nouvelle-realisation");
  };

  const museum = draft ? isMuseumRender(draft.visuel, draft.modele) : false;

  const save = async () => {
    if (!draft) return;
    setOk("");
    const problems: string[] = [];
    if (!draft.type) problems.push(t.needType);
    if (!draft.visuel) problems.push(t.needPhoto);
    if (modelPending) problems.push(t.needModel);
    if (draft.type === "reel" && museum) problems.push(t.museumReel);
    if (problems.length) {
      setErrors(problems);
      if (!draft.visuel) photo.current?.focus();
      return;
    }
    const slug = slugify(draft.slug || draft.titre);
    if (previousSlug && slug !== previousSlug && !window.confirm(t.confirmSlug)) return;
    setSaving(true);
    setErrors([]);
    try {
      const payload = { ...draft, slug };
      if (!payload.patine) delete payload.patine;
      if (!payload.modele) delete payload.modele;
      await adminApi("PUT", "/api/admin/content", {
        kind: "realisation",
        data: payload,
        previousSlug,
      });
      await onSaved();
      setOk(admin.common.saved);
      close(`modifier-${slug}`);
    } catch (e) {
      setErrors(describe(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (slug: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await adminApi("DELETE", "/api/admin/content", { slug });
      await onSaved();
      setOk(admin.common.saved);
      close("nouvelle-realisation");
    } catch (e) {
      setErrors(describe(e));
    }
  };

  if (!draft) {
    return (
      <div className="flex flex-col gap-6">
        <p className="max-w-2xl text-ink-muted">{t.intro}</p>
        <button
          id="nouvelle-realisation"
          type="button"
          onClick={() => open(null)}
          className="label-mono min-h-10 self-start rounded-full bg-ink px-5 py-3 text-surface"
        >
          {t.add}
        </button>
        <SaveStatus messages={errors} ok={ok} />
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {data.realisations.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <span className="label-mono w-8 text-ink-muted">{r.ordre}</span>
              <span className="min-w-0 flex-1 basis-48 font-serif text-xl text-ink">
                {frTypo(r.titre)}
              </span>
              <span className="label-mono rounded-full border border-line px-3 py-1 text-ink-muted">
                {r.type === "reel" ? t.realBadge : t.illustrativeBadge}
              </span>
              <button
                id={`modifier-${r.slug}`}
                type="button"
                onClick={() => open(r)}
                className={pillClass}
              >
                {t.edit}
                <span className="sr-only"> : {frTypo(r.titre)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const modelValue =
    draft.modele === undefined ? "" : typeof draft.modele === "string" ? draft.modele : "__envoi";

  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="text-h3 font-serif outline-none">
        {isNew ? t.creating : t.editing.replace("{titre}", frTypo(draft.titre))}
      </h2>

      <Field label={`${f.titre} (${admin.common.required})`}>
        {(p) => (
          <input
            {...p}
            className={inputClass}
            required
            maxLength={120}
            value={draft.titre}
            onChange={(e) => {
              const titre = e.target.value;
              setDraft((d) =>
                d ? { ...d, titre, slug: slugTouched ? d.slug : slugify(titre) } : d,
              );
            }}
          />
        )}
      </Field>
      <Field label={f.slug} hint={`${f.slugHint}${slugify(draft.slug) || "…"}`}>
        {(p) => (
          <input
            {...p}
            className={inputClass}
            required
            maxLength={80}
            value={draft.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            onBlur={(e) => set("slug", slugify(e.target.value))}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">
          {f.type} ({admin.common.required})
        </legend>
        {(["reel", "illustratif"] as const).map((type) => (
          <label key={type} className="flex min-h-8 items-center gap-2 text-ink">
            <input
              type="radio"
              name="type"
              checked={draft.type === type}
              disabled={type === "reel" && museum}
              onChange={() => set("type", type)}
            />
            {type === "reel" ? f.reel : f.illustratif}
          </label>
        ))}
        {museum && <p className="text-xs text-ink-muted">{t.museumHint}</p>}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={f.univers}>
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={draft.univers}
              onChange={(e) => set("univers", e.target.value)}
            >
              {data.options.univers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label={f.ordre}>
          {(p) => (
            <input
              {...p}
              type="number"
              className={inputClass}
              value={draft.ordre}
              onChange={(e) => set("ordre", Number(e.target.value) || 0)}
            />
          )}
        </Field>
      </div>

      {(
        [
          ["description", f.description, 300],
          ["besoin", f.besoin, 600],
          ["solution", f.solution, 800],
        ] as const
      ).map(([key, label, max]) => (
        <Field key={key} label={`${label} (${admin.common.required})`}>
          {(p) => (
            <textarea
              {...p}
              className={inputClass}
              required
              rows={3}
              maxLength={max}
              value={draft[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          )}
        </Field>
      ))}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">{f.etapes}</legend>
        <p className="text-xs text-ink-muted">{f.etapesHint}</p>
        {data.options.etapes.map((s) => (
          <label key={s.id} className="flex min-h-8 items-center gap-2 text-ink">
            <input
              type="checkbox"
              checked={draft.etapes.includes(s.id)}
              onChange={(e) =>
                set(
                  "etapes",
                  data.options.etapes
                    .map((x) => x.id)
                    .filter((id) => (id === s.id ? e.target.checked : draft.etapes.includes(id))),
                )
              }
            />
            {s.label}
          </label>
        ))}
      </fieldset>

      <ImageField
        label={`${f.visuel} (${admin.common.required})`}
        value={currentImage(draft.visuel)}
        onChange={(img) => set("visuel", img)}
        fieldsetRef={photo}
      />

      <fieldset className="flex flex-col gap-4 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">{f.modele}</legend>
        <Field label={f.modeleSelect}>
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={modelValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") set("modele", undefined);
                else if (v !== "__envoi") set("modele", v);
              }}
            >
              <option value="">{f.modeleNone}</option>
              {data.options.modeles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              {typeof draft.modele === "object" && (
                <option value="__envoi">{f.modeleUploaded}</option>
              )}
            </select>
          )}
        </Field>
        <Field label={f.patine}>
          {(p) => (
            <select
              {...p}
              className={inputClass}
              value={draft.patine ?? "brun-medaille"}
              onChange={(e) => set("patine", e.target.value as Patine)}
            >
              {data.options.patines
                .filter((x) => (PATINES as readonly string[]).includes(x.id))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
            </select>
          )}
        </Field>
        <ModelField
          patine={(draft.patine as Patine) ?? "brun-medaille"}
          onPendingChange={setModelPending}
          onDone={(m) => {
            setDraft((d) =>
              d
                ? {
                    ...d,
                    modele: {
                      src: m.src,
                      legend: typeof d.modele === "object" ? d.modele.legend : "",
                    },
                    // Pas encore de photo : l'image du modèle en tient lieu (à décrire).
                    visuel: d.visuel ?? { ...m.image, alt: "" },
                  }
                : d,
            );
          }}
        />
        {typeof draft.modele === "object" && (
          <Field label={f.legend} hint={f.legendHint}>
            {(p) => (
              <input
                {...p}
                className={inputClass}
                maxLength={300}
                value={
                  draft.modele && typeof draft.modele === "object"
                    ? (draft.modele.legend ?? "")
                    : ""
                }
                onChange={(e) =>
                  setDraft((d) =>
                    d && typeof d.modele === "object"
                      ? { ...d, modele: { ...d.modele, legend: e.target.value } }
                      : d,
                  )
                }
              />
            )}
          </Field>
        )}
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <SaveStatus messages={errors} ok={ok} />
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="label-mono min-h-10 rounded-full bg-ink px-6 py-3 text-surface"
          >
            {saving ? admin.common.saving : admin.common.save}
          </button>
          <button type="button" onClick={cancel} className={pillClass}>
            {admin.common.cancel}
          </button>
          {!isNew && previousSlug && (
            <button
              type="button"
              onClick={() => void remove(previousSlug)}
              className={`${pillClass} ml-auto`}
            >
              {admin.common.remove}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
