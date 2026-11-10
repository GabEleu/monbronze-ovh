"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PATINES, type Patine } from "@/content/assets";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import {
  contactSchema,
  extensionOf,
  UNIVERS,
  UPLOAD,
  type ContactData,
} from "@/lib/contact-schema";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { uploadFile } from "@/lib/upload-client";

type Item = {
  id: string;
  file: File;
  progress: number;
  /** Clé de l'objet dans le stockage privé, une fois envoyé. */
  key: string;
  error?: string;
  preview?: string;
};

const STEP_FIELDS: FieldPath<ContactData>[][] = [
  ["source", "patine"],
  ["demande", "univers"],
  ["fichiers"],
  ["prenom", "nom", "email", "telephone", "consentement"],
];

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => void;
      reset: () => void;
    };
  }
}

/**
 * Formulaire de contact en 4 étapes (BRIEF.md §7) : conversationnel, barre de progression
 * en métal, envoi direct des fichiers vers le stockage privé (OVHcloud Object Storage), validation client et serveur (zod),
 * sceau de confirmation. Sans clés : mode simulé (aucun envoi).
 * Accessibilité : étiquettes, focus déplacé sur le titre de chaque étape, erreurs annoncées
 * (role="alert"), tout au clavier.
 */
export function ContactForm({
  uploadEnabled,
  turnstileKey,
}: {
  uploadEnabled: boolean;
  turnstileKey?: string;
}) {
  const t = site.contact.form;
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("");
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [announce, setAnnounce] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const done = useRef<HTMLHeadingElement>(null);
  const turnstileBox = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const id = useId();

  const form = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    mode: "onTouched",
    defaultValues: {
      source: undefined,
      patine: "",
      demande: "",
      univers: "",
      fichiers: [],
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      site: "",
      turnstile: "",
    },
  });
  const { register, formState, setValue, control } = form;
  const errors = formState.errors;
  const patine = useWatch({ control, name: "patine" });

  // Venue du configurateur (?patine=…) : patine pré-remplie.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("patine");
    if (p && (PATINES as readonly string[]).includes(p)) setValue("patine", p as Patine);
  }, [setValue]);

  // Focus sur le titre de chaque nouvelle étape (pas au premier affichage).
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (state === "done") done.current?.focus();
  }, [state]);

  // Pièces jointes terminées → valeur du formulaire.
  useEffect(() => {
    setValue(
      "fichiers",
      items
        .filter((i) => !i.error && i.progress >= 100)
        .map((i) => ({ name: i.file.name, size: i.file.size, key: i.key })),
    );
  }, [items, setValue]);

  // Cloudflare Turnstile (seulement si une clé est configurée).
  useEffect(() => {
    if (!turnstileKey || step !== 3 || !turnstileBox.current) return;
    const el = turnstileBox.current;
    const render = () =>
      window.turnstile?.render(el, {
        sitekey: turnstileKey,
        callback: (token) => setValue("turnstile", token),
      });
    if (window.turnstile) return void render();
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [turnstileKey, step, setValue]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFileError(null);
    const incoming = Array.from(list);
    if (items.length + incoming.length > UPLOAD.maxFiles) {
      setFileError(t.files.errors.count);
      return;
    }
    const accepted: Item[] = [];
    for (const file of incoming) {
      if (!(UPLOAD.extensions as readonly string[]).includes(extensionOf(file.name))) {
        setFileError(fill(t.files.errors.type, { name: file.name }));
        continue;
      }
      if (file.size > UPLOAD.maxBytes) {
        setFileError(fill(t.files.errors.size, { name: file.name }));
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: uploadEnabled ? 0 : 100,
        key: "",
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    setItems((prev) => [...prev, ...accepted]);
    if (!uploadEnabled) return;
    for (const item of accepted) {
      uploadFile(item.file, (percentage) =>
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: Math.min(99, percentage) } : i)),
        ),
      )
        .then((key) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: 100, key } : i)),
          );
          setAnnounce(`${item.file.name} : ${t.files.sent}`);
        })
        .catch(() => {
          const message = fill(t.files.errors.upload, { name: item.file.name });
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, error: message } : i)));
          setAnnounce(message);
        });
    }
  };

  const remove = (item: Item) => {
    if (item.preview) URL.revokeObjectURL(item.preview);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const goNext = async () => {
    const fields = STEP_FIELDS[step]!;
    const ok = await form.trigger(fields);
    const uploading = step === 2 && items.some((i) => i.progress < 100 && !i.error);
    if (!ok || uploading) {
      const messages = fields
        .map((f) => form.getFieldState(f).error?.message)
        .filter((m): m is string => Boolean(m));
      setStepErrors(uploading ? [...messages, t.files.uploading] : messages);
      return;
    }
    setStepErrors([]);
    moved.current = true;
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setStepErrors([]);
    moved.current = true;
    setStep((s) => Math.max(0, s - 1));
  };

  const onSubmit = form.handleSubmit(
    async (data) => {
      setState("sending");
      setServerError(null);
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = (await res.json()) as { ok: boolean; mode?: string; error?: string };
        if (!json.ok) throw new Error(json.error);
        setMode(json.mode ?? "");
        setState("done");
      } catch (error) {
        setServerError((error as Error).message || site.contact.direct);
        setState("idle");
        // Le jeton anti-spam ne sert qu'une fois : nouveau défi.
        if (turnstileKey) {
          window.turnstile?.reset();
          setValue("turnstile", "");
        }
      }
    },
    () => {
      setStepErrors(
        STEP_FIELDS[3]!
          .map((f) => form.getFieldState(f).error?.message)
          .filter((m): m is string => Boolean(m)),
      );
    },
  );

  if (state === "done") {
    return (
      <div className="contact-done flex flex-col items-start gap-8" aria-live="polite">
        <div aria-hidden="true" className="seal">
          <svg viewBox="0 0 200 200" className="seal__disc">
            <defs>
              <path id={`${id}-ring`} d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
              <radialGradient id={`${id}-bronze`} cx="35%" cy="30%" r="80%">
                <stop offset="0" stopColor="#e8c08a" />
                <stop offset="0.45" stopColor="#8a5a32" />
                <stop offset="1" stopColor="#2b180c" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="96" fill={`url(#${id}-bronze)`} />
            <circle cx="100" cy="100" r="86" fill="none" stroke="#f2ece1" strokeOpacity="0.35" />
            <text className="seal__ring">
              <textPath href={`#${id}-ring`}>
                MONBRONZE · {t.done.seal.toUpperCase()} · MONBRONZE ·
              </textPath>
            </text>
            <text x="100" y="116" textAnchor="middle" className="seal__mark">
              mb
            </text>
          </svg>
        </div>
        <h2 ref={done} tabIndex={-1} className="text-h2 max-w-[22ch] outline-none">
          {t.done.title}
        </h2>
        <p className="text-lead max-w-xl text-ink-muted">
          {mode === "envoye" ? t.done.text : t.done.textSimulated}
        </p>
        {mode === "simule" && (
          <p className="label-mono max-w-xl text-ink-muted">{t.done.simulated}</p>
        )}
      </div>
    );
  }

  const progress = ((step + 1) / 4) * 100;
  const fieldClass =
    "w-full rounded-none border-0 border-b border-line-strong bg-transparent py-3 text-lg text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink aria-invalid:border-[#b3261e]";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <p className="label-mono text-ink-muted">{fill(t.progress, { n: String(step + 1) })}</p>
        <div
          role="progressbar"
          aria-label={t.title}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step + 1}
          className="contact-progress"
        >
          <div className="contact-progress__metal" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 ref={heading} tabIndex={-1} className="text-h2 outline-none">
        {t.steps[step]}
      </h2>

      {stepErrors.length > 0 && (
        <div role="alert" className="contact-errors">
          <p className="font-medium">{t.errorsTitle}</p>
          <ul className="list-disc pl-5">
            {stepErrors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Annonces des envois de fichiers (asynchrones) pour les lecteurs d'écran. */}
      <p role="status" className="sr-only">
        {announce}
      </p>

      {/* Champ piège : invisible pour les personnes, rempli par les robots. */}
      <div aria-hidden="true" className="contact-trap">
        <label>
          Site web
          <input type="text" tabIndex={-1} autoComplete="off" {...register("site")} />
        </label>
      </div>

      {step === 0 && (
        <fieldset className="flex flex-col gap-6">
          <legend className="sr-only">{t.steps[0]}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {t.sources.map((src) => (
              <label key={src.id} className="contact-card">
                <input type="radio" value={src.id} {...register("source")} className="sr-only" />
                <span className="font-serif text-2xl leading-tight">{src.label}</span>
                <span className="text-sm text-ink-muted">{src.hint}</span>
              </label>
            ))}
          </div>
          {patine && (
            <p className="label-mono text-ink-muted">
              {t.patine}&nbsp;:{" "}
              <span className="text-ink">{site.patines.find((p) => p.id === patine)?.label}</span>
            </p>
          )}
        </fieldset>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-demande`} className="label-mono text-ink-muted">
              {t.demande.label}
            </label>
            <textarea
              id={`${id}-demande`}
              rows={6}
              aria-describedby={`${id}-demande-hint${errors.demande ? ` ${id}-demande-err` : ""}`}
              aria-invalid={errors.demande ? true : undefined}
              className={cn(fieldClass, "resize-y")}
              {...register("demande")}
            />
            <p id={`${id}-demande-hint`} className="text-sm text-ink-muted">
              {t.demande.hint}
            </p>
            {errors.demande && (
              <p id={`${id}-demande-err`} className="contact-error">
                {errors.demande.message}
              </p>
            )}
          </div>
          <fieldset className="flex flex-col gap-4">
            <legend className="label-mono mb-2 text-ink-muted">{t.univers.legend}</legend>
            <div className="flex flex-wrap gap-2">
              {UNIVERS.map((u) => (
                <label key={u} className="contact-chip">
                  <input type="radio" value={u} {...register("univers")} className="sr-only" />
                  {t.univers.options[u]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div
            className="contact-drop"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.dataset.over = "";
            }}
            onDragLeave={(e) => delete e.currentTarget.dataset.over}
            onDrop={(e) => {
              e.preventDefault();
              delete e.currentTarget.dataset.over;
              addFiles(e.dataTransfer.files);
            }}
          >
            <p>
              {t.files.drop}{" "}
              <label className="cursor-pointer underline underline-offset-4">
                {t.files.browse}
                <input
                  type="file"
                  multiple
                  accept={UPLOAD.extensions.map((e) => `.${e}`).join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </p>
            <p className="text-sm text-ink-muted">{t.files.formats}</p>
            {!uploadEnabled && <p className="label-mono text-ink-muted">{t.files.simulated}</p>}
          </div>
          {fileError && (
            <p role="alert" className="contact-error">
              {fileError}
            </p>
          )}
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">{t.files.none}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="contact-file">
                  {item.preview ? (
                    // Aperçu local (blob:), hors next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview} alt="" className="size-14 object-cover" />
                  ) : (
                    <span aria-hidden="true" className="contact-file__ext label-mono">
                      {extensionOf(item.file.name)}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="truncate text-sm text-ink">{item.file.name}</span>
                    {item.error ? (
                      <span className="contact-error">{item.error}</span>
                    ) : (
                      <div
                        role="progressbar"
                        aria-label={item.file.name}
                        aria-valuenow={Math.round(item.progress)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="contact-file__bar"
                      >
                        <div style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="label-mono min-h-6 text-ink-muted underline underline-offset-4 hover:text-ink"
                  >
                    {t.files.remove}
                    <span className="sr-only"> {item.file.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-8 sm:grid-cols-2">
          {(["prenom", "nom", "email", "telephone"] as const).map((name) => (
            <div key={name} className="flex flex-col gap-2">
              <label htmlFor={`${id}-${name}`} className="label-mono text-ink-muted">
                {t.fields[name]}
              </label>
              <input
                id={`${id}-${name}`}
                type={name === "email" ? "email" : name === "telephone" ? "tel" : "text"}
                autoComplete={
                  name === "prenom"
                    ? "given-name"
                    : name === "nom"
                      ? "family-name"
                      : name === "email"
                        ? "email"
                        : "tel"
                }
                aria-invalid={errors[name] ? true : undefined}
                aria-describedby={errors[name] ? `${id}-${name}-err` : undefined}
                className={fieldClass}
                {...register(name)}
              />
              {errors[name] && (
                <p id={`${id}-${name}-err`} className="contact-error">
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="flex items-start gap-3 text-ink">
              <input
                type="checkbox"
                aria-invalid={errors.consentement ? true : undefined}
                aria-describedby={errors.consentement ? `${id}-consent-err` : undefined}
                className="mt-1 size-5 shrink-0 accent-bronze"
                {...register("consentement")}
              />
              <span>{t.fields.consent}</span>
            </label>
            <TransitionLink
              href="/confidentialite"
              className="ml-8 self-start text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              {t.fields.privacy}
            </TransitionLink>
            {errors.consentement && (
              <p id={`${id}-consent-err`} className="contact-error">
                {errors.consentement.message}
              </p>
            )}
          </div>
          {turnstileKey && <div ref={turnstileBox} className="sm:col-span-2" />}
        </div>
      )}

      {serverError && (
        <p role="alert" className="contact-error">
          {serverError}
        </p>
      )}

      <div className="contact-nav flex flex-wrap items-center gap-3 border-t border-line pt-8">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="label-mono h-14 rounded-full border border-line-strong px-6 text-ink hover:border-ink"
          >
            ← {t.back}
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            className="label-mono h-14 rounded-full bg-ink px-8 text-surface transition-colors hover:bg-accent-ink"
          >
            {t.next} →
          </button>
        ) : (
          <button
            type="submit"
            disabled={state === "sending"}
            className="label-mono inline-flex h-16 items-center gap-3 rounded-full bg-ink px-8 text-sm text-surface transition-colors hover:bg-accent-ink disabled:cursor-wait"
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-incandescent shadow-[0_0_10px_2px_rgb(255_91_31/0.65)]"
            />
            {state === "sending" ? t.sending : t.submit}
          </button>
        )}
      </div>
    </form>
  );
}
