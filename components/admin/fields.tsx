"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useId, useRef, useState } from "react";
import type { Patine } from "@/content/assets";
import { admin } from "@/content/admin";
import { adminApi, shrinkImage, videoPoster } from "@/lib/admin/client";
import { useErrorMessages } from "@/components/admin/context";

const ModelPreview = dynamic(() => import("@/components/admin/ModelPreview"), { ssr: false });

export const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-or";

export const pillClass =
  "label-mono inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 py-2 text-ink";

export type MediaImage = { src: string; width: number; height: number; alt: string };
export type MediaVideo = { src: string; poster: string };

/** Libellé + champ + aide, reliés pour les lecteurs d'écran. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, "aria-describedby": hint ? hintId : undefined })}
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Bouton « fichier » accessible (le vrai champ est masqué, son libellé sert de bouton). */
function FileButton({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`${pillClass} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-or`}
    >
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

/** Photo : envoi, aperçu, description obligatoire (vidée à chaque nouvelle photo). */
export function ImageField({
  label,
  value,
  onChange,
  fieldsetRef,
}: {
  label: string;
  value: MediaImage | null;
  onChange: (value: MediaImage) => void;
  fieldsetRef?: React.Ref<HTMLFieldSetElement>;
}) {
  const t = admin.media;
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const alt = useRef<HTMLTextAreaElement>(null);
  const describe = useErrorMessages();

  const upload = async (file: File) => {
    setBusy(true);
    setErrors([]);
    try {
      const form = new FormData();
      form.set("kind", "image");
      form.set("file", await shrinkImage(file), "photo.jpg");
      const res = await adminApi<{ src: string; width: number; height: number }>(
        "POST",
        "/api/admin/media",
        form,
      );
      // Nouvelle photo = nouvelle description (l'ancienne décrivait l'ancienne image).
      onChange({ ...res, alt: "" });
      requestAnimationFrame(() => alt.current?.focus());
    } catch (e) {
      setErrors(describe(e).map((m) => m.replace(admin.common.error, t.error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset
      ref={fieldsetRef}
      tabIndex={-1}
      className="flex flex-col gap-3 rounded-md border border-line p-4"
    >
      <legend className="px-1 text-sm font-medium text-ink">{label}</legend>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu d'administration
        <img
          src={value.src}
          alt=""
          className="max-h-48 w-auto self-start rounded border border-line"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FileButton
          label={busy ? t.uploading : value ? t.replace : t.choose}
          accept="image/*,.heic,.heif"
          disabled={busy}
          onFile={(f) => void upload(f)}
        />
        <span className="text-xs text-ink-muted">{t.imageHint}</span>
      </div>
      {value && (
        <Field label={t.alt} hint={t.altHint}>
          {(p) => (
            <textarea
              {...p}
              ref={alt}
              rows={2}
              className={inputClass}
              value={value.alt}
              maxLength={300}
              required
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />
          )}
        </Field>
      )}
      {errors.length > 0 && (
        <p role="alert" className="text-sm font-medium text-ink">
          {errors.join(" ")}
        </p>
      )}
    </fieldset>
  );
}

/** Vidéo courte (MP4) : l'affiche est prise dans la vidéo, par le navigateur. */
export function VideoField({
  value,
  onChange,
}: {
  value: MediaVideo | null;
  onChange: (value: MediaVideo | null) => void;
}) {
  const t = admin.media;
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const describe = useErrorMessages();

  const upload = async (file: File) => {
    setBusy(true);
    setErrors([]);
    try {
      const form = new FormData();
      form.set("kind", "video");
      form.set("file", file, "video.mp4");
      form.set("poster", await videoPoster(file), "affiche.jpg");
      onChange(await adminApi<MediaVideo>("POST", "/api/admin/media", form));
    } catch (e) {
      setErrors(describe(e).map((m) => m.replace(admin.common.error, t.error)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
      <legend className="px-1 text-sm font-medium text-ink">{admin.atelier.video}</legend>
      {value && (
        <video
          src={value.src}
          poster={value.poster}
          muted
          playsInline
          controls
          className="max-h-48 w-auto self-start rounded border border-line"
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FileButton
          label={busy ? t.uploading : value ? t.replace : t.choose}
          accept="video/mp4"
          disabled={busy}
          onFile={(f) => void upload(f)}
        />
        {value && (
          <button
            type="button"
            className="label-mono min-h-10 px-1 py-2 text-ink underline"
            onClick={() => onChange(null)}
          >
            {admin.atelier.removeVideo}
          </button>
        )}
        <span className="text-xs text-ink-muted">{t.videoHint}</span>
      </div>
      {errors.length > 0 && (
        <p role="alert" className="text-sm font-medium text-ink">
          {errors.join(" ")}
        </p>
      )}
    </fieldset>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Aperçu 3D : une erreur (pilote, mémoire) reste dans ce cadre, le reste de la page survit. */
class PreviewBoundary extends Component<
  { children: React.ReactNode; onError: () => void },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? (
      <p role="alert" className="p-4 text-sm font-medium text-ivoire">
        {admin.model.previewFailed}
      </p>
    ) : (
      this.props.children
    );
  }
}

type ModelResult = { src: string; image: { src: string; width: number; height: number } };

/**
 * Modèle 3D : préparé dans le navigateur (simplification, cuisson des creux), aperçu en
 * bronze, puis envoi du GLB et d'une image fixe prise sous l'angle choisi. Le modèle n'est
 * publié qu'avec le bouton « Enregistrer » de la réalisation.
 */
export function ModelField({
  patine,
  onDone,
  onPendingChange,
}: {
  patine: Patine;
  onDone: (result: ModelResult) => void;
  /** Vrai tant qu'un modèle est en préparation ou en aperçu (pas encore utilisé). */
  onPendingChange: (pending: boolean) => void;
}) {
  const t = admin.model;
  const [state, setState] = useState<
    | { step: "idle" }
    | { step: "working"; label: string; progress: number | null }
    | { step: "preview"; url: string; glb: Uint8Array }
    | { step: "used" }
    | { step: "error"; message: string }
  >({ step: "idle" });
  const [lying, setLying] = useState(false);
  const [turn, setTurn] = useState(0);
  const [saving, setSaving] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const describe = useErrorMessages();
  const onCanvas = useCallback((c: HTMLCanvasElement | null) => {
    canvas.current = c;
    setCanvasReady(Boolean(c));
  }, []);
  const busy = state.step === "working" || state.step === "preview";

  useEffect(() => onPendingChange(busy), [busy, onPendingChange]);
  useEffect(
    () => () => {
      if (state.step === "preview") URL.revokeObjectURL(state.url);
    },
    [state],
  );

  const prepare = async (file: File) => {
    if (!hasWebGL()) {
      setState({ step: "error", message: t.noWebgl });
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setState({ step: "error", message: t.tooBig });
      return;
    }
    setState({ step: "working", label: t.reading, progress: null });
    try {
      const { prepareModelInBrowser } = await import("@/lib/admin/prepare-model-browser");
      const glb = await prepareModelInBrowser(
        file,
        { rotateX: lying ? -90 : 0, rotateY: turn },
        (f) => setState({ step: "working", label: t.preparing, progress: f }),
      );
      const url = URL.createObjectURL(new Blob([glb as BlobPart], { type: "model/gltf-binary" }));
      setCanvasReady(false);
      setState({ step: "preview", url, glb });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState({ step: "error", message: `${t.failed} ${message}` });
    }
  };

  const use = async () => {
    if (state.step !== "preview" || !canvas.current) return;
    setSaving(true);
    try {
      const still = await new Promise<Blob>((resolve, reject) =>
        canvas.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("image"))), "image/png"),
      );
      const form = new FormData();
      form.set("kind", "model");
      form.set(
        "file",
        new Blob([state.glb as BlobPart], { type: "model/gltf-binary" }),
        "modele.glb",
      );
      form.set("image", still, "modele.png");
      onDone(await adminApi<ModelResult>("POST", "/api/admin/media", form));
      setState({ step: "used" });
    } catch (e) {
      setState({ step: "error", message: describe(e).join(" ") });
    } finally {
      setSaving(false);
    }
  };

  const progress =
    state.step === "working" && state.progress !== null
      ? `${state.label} : ${Math.round(state.progress * 100)} %`
      : state.step === "working"
        ? state.label
        : "";

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-line-strong p-4">
      <p className="text-xs text-ink-muted">{t.hint}</p>
      <fieldset disabled={busy} className="flex flex-wrap items-center gap-4">
        <label className="flex min-h-10 items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={lying} onChange={(e) => setLying(e.target.checked)} />
          {t.lying}
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          {t.turn}
          <select
            className={`${inputClass} w-auto`}
            value={turn}
            onChange={(e) => setTurn(Number(e.target.value))}
          >
            {[0, 90, 180, 270].map((deg) => (
              <option key={deg} value={deg}>
                {deg}°
              </option>
            ))}
          </select>
        </label>
        {busy && <p className="basis-full text-xs text-ink-muted">{t.orientationLocked}</p>}
      </fieldset>
      {!busy && (
        <div>
          <FileButton
            label={t.choose}
            accept=".glb,.gltf,.obj,.stl,.ply"
            onFile={(f) => void prepare(f)}
          />
        </div>
      )}
      {state.step === "working" && (
        <div role="status" className="flex flex-col gap-2">
          <span className="text-sm text-ink">{progress}</span>
          <progress
            className="w-full"
            max={1}
            value={state.progress ?? undefined}
            aria-label={state.label}
          />
        </div>
      )}
      {state.step === "preview" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">{t.ready}</p>
          <div className="aspect-square w-full max-w-sm rounded-md bg-charbon">
            <PreviewBoundary onError={() => setState({ step: "error", message: t.previewFailed })}>
              <ModelPreview url={state.url} patine={patine} onCanvas={onCanvas} />
            </PreviewBoundary>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || !canvasReady}
              onClick={() => void use()}
              className="label-mono min-h-10 rounded-full bg-ink px-5 py-2 text-surface"
            >
              {saving ? admin.media.uploading : t.save}
            </button>
            <button type="button" onClick={() => setState({ step: "idle" })} className={pillClass}>
              {t.retry}
            </button>
          </div>
        </div>
      )}
      {state.step === "used" && (
        <p role="status" className="text-sm font-medium text-ink">
          {t.used}
        </p>
      )}
      {state.step === "error" && (
        <p role="alert" className="text-sm font-medium text-ink">
          {state.message}
        </p>
      )}
    </div>
  );
}
