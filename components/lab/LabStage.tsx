"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState, type ReactNode } from "react";
import { environments, models, PATINES, type ModelId, type Patine } from "@/content/assets";
import { site } from "@/content/site";
import { PATINA_PRESETS } from "@/webgl/materials/patinas";
import { useCalmMode } from "@/lib/preferences";
import type { LabSettings, ToneMappingMode } from "@/webgl/lab/LabScene";
import type { StudioEnv } from "@/webgl/scene/Studio";

// three.js n'est chargé que sur cette page, côté navigateur.
const LabScene = dynamic(() => import("@/webgl/lab/LabScene"), {
  ssr: false,
  loading: () => (
    <p className="label-mono absolute inset-0 grid place-items-center text-ink-muted">
      {site.lab.loading}
    </p>
  ),
});

const t = site.lab.controls;

function presetSettings(patine: Patine) {
  const p = PATINA_PRESETS[patine];
  return {
    cavityLo: p.cavityLo,
    cavityHi: p.cavityHi,
    polishLo: p.polishLo,
    polishHi: p.polishHi,
    deep: p.deepDarken,
    metalRoughness: p.metalRoughness,
    patinaRoughness: p.patinaRoughness,
  };
}

const INITIAL: LabSettings = {
  model: Object.keys(models)[0] as ModelId,
  patine: "brun-medaille",
  ...presetSettings("brun-medaille"),
  noise: 0.14,
  exposure: 1.2,
  env: 0.35,
  envMap: "studio",
  rakeAngle: 35,
  rakeIntensity: 2.2,
  toneMapping: "agx",
  autoRotate: true,
  viewAngle: 0,
  debugCavity: false,
  floor: true,
};

const formatValue = (value: number, step: number) =>
  value.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(step) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(step) ? 0 : 2,
  });

function Range({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs text-ink">
          {label}
        </label>
        {/* Hors du label : n'altère pas le nom accessible ; aria-live off : pas de double annonce. */}
        <output htmlFor={id} aria-live="off" className="label-mono text-[0.625rem] text-ink-muted">
          {formatValue(value, step)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-or"
      />
    </div>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 border-t border-line pt-4">{children}</div>;
}

/** Laboratoire des matériaux : scène bronze + panneau de réglages accessible. */
export function LabStage() {
  const [s, setS] = useState<LabSettings>(INITIAL);
  const fpsRef = useRef<HTMLElement>(null);
  const set = <K extends keyof LabSettings>(key: K, value: LabSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const choosePatine = (patine: Patine) =>
    setS((prev) => ({ ...prev, patine, ...presetSettings(patine) }));
  const [copied, setCopied] = useState(false);
  // Mouvement réduit ou expérience allégée : pas de rotation automatique.
  const calm = useCalmMode();
  const scene = { ...s, autoRotate: s.autoRotate && !calm };
  const modelId = useId();
  const toneId = useId();
  const envId = useId();

  return (
    <div className="grid border-t border-line lg:h-[calc(100svh-var(--header-h))] lg:grid-cols-[1fr_22rem]">
      <div
        data-lenis-prevent
        className="relative h-[70svh] min-h-96 bg-[radial-gradient(ellipse_at_50%_45%,#1a1714_0%,#0a0908_70%)] lg:h-full"
      >
        <LabScene settings={scene} fpsTarget={fpsRef} />
        <p
          className="label-mono pointer-events-none absolute top-4 left-4 text-ink-muted"
          aria-live="off"
        >
          {t.fps}&nbsp;:{" "}
          <span ref={fpsRef} data-testid="fps" className="text-ink">
            -
          </span>
        </p>
      </div>

      <form
        aria-label={t.title}
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-5"
        data-lenis-prevent
      >
        <h2 className="label-mono text-ink-muted">{t.title}</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={modelId} className="text-xs text-ink">
            {t.model}
          </label>
          <select
            id={modelId}
            value={s.model}
            onChange={(e) => set("model", e.target.value as ModelId)}
            className="rounded-md border border-line-strong bg-charbon px-3 py-2 text-sm text-ink"
          >
            {(Object.keys(models) as ModelId[]).map((id) => (
              <option key={id} value={id}>
                {models[id].subject}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-xs text-ink">{t.patine}</legend>
          <div className="grid grid-cols-2 gap-2">
            {PATINES.map((p) => (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-ink has-checked:border-or has-focus-visible:outline-2 has-focus-visible:outline-or"
              >
                <input
                  type="radio"
                  name="patine"
                  value={p}
                  checked={s.patine === p}
                  onChange={() => choosePatine(p)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full ring-1 ring-line-strong"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${PATINA_PRESETS[p].metal}, ${PATINA_PRESETS[p].patina})`,
                  }}
                />
                {site.patines.find((x) => x.id === p)?.label}
                {s.patine === p && (
                  <span aria-hidden="true" className="ml-auto text-or">
                    ✓
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <Group>
          <Range
            label={t.cavityLo}
            value={s.cavityLo}
            min={0}
            max={1}
            onChange={(v) => set("cavityLo", v)}
          />
          <Range
            label={t.cavityHi}
            value={s.cavityHi}
            min={0}
            max={1}
            onChange={(v) => set("cavityHi", v)}
          />
          <Range
            label={t.polishLo}
            value={s.polishLo}
            min={0}
            max={1}
            onChange={(v) => set("polishLo", v)}
          />
          <Range
            label={t.polishHi}
            value={s.polishHi}
            min={0}
            max={1}
            onChange={(v) => set("polishHi", v)}
          />
          <Range
            label={t.noise}
            value={s.noise}
            min={0}
            max={0.8}
            onChange={(v) => set("noise", v)}
          />
          <Range label={t.deep} value={s.deep} min={0} max={1} onChange={(v) => set("deep", v)} />
          <Range
            label={t.metalRoughness}
            value={s.metalRoughness}
            min={0.04}
            max={1}
            onChange={(v) => set("metalRoughness", v)}
          />
          <Range
            label={t.patinaRoughness}
            value={s.patinaRoughness}
            min={0.04}
            max={1}
            onChange={(v) => set("patinaRoughness", v)}
          />
          <button
            type="button"
            onClick={() => choosePatine(s.patine)}
            className="label-mono self-start text-[0.625rem] text-ink underline decoration-line-strong underline-offset-4"
          >
            {t.reset}
          </button>
        </Group>

        <Group>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={envId} className="text-xs text-ink">
              {t.envMap}
            </label>
            <select
              id={envId}
              value={s.envMap}
              onChange={(e) => set("envMap", e.target.value as StudioEnv)}
              className="rounded-md border border-line-strong bg-charbon px-3 py-2 text-sm text-ink"
            >
              {Object.entries(environments).map(([id, e]) => (
                <option key={id} value={id}>
                  {e.subject}
                </option>
              ))}
              <option value="procedural">{t.envProcedural}</option>
            </select>
          </div>
          <Range
            label={t.exposure}
            value={s.exposure}
            min={0.3}
            max={2.5}
            onChange={(v) => set("exposure", v)}
          />
          <Range label={t.env} value={s.env} min={0} max={3} onChange={(v) => set("env", v)} />
          <Range
            label={t.rakeAngle}
            value={s.rakeAngle}
            min={0}
            max={360}
            step={1}
            onChange={(v) => set("rakeAngle", v)}
          />
          <Range
            label={t.rakeIntensity}
            value={s.rakeIntensity}
            min={0}
            max={8}
            onChange={(v) => set("rakeIntensity", v)}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={toneId} className="text-xs text-ink">
              {t.toneMapping}
            </label>
            <select
              id={toneId}
              value={s.toneMapping}
              onChange={(e) => set("toneMapping", e.target.value as ToneMappingMode)}
              className="rounded-md border border-line-strong bg-charbon px-3 py-2 text-sm text-ink"
            >
              <option value="neutral">Khronos PBR Neutral</option>
              <option value="agx">AgX</option>
              <option value="aces">ACES Filmic</option>
            </select>
          </div>
        </Group>

        <Group>
          <label className="flex items-center gap-3 text-xs text-ink">
            <input
              type="checkbox"
              checked={s.autoRotate}
              onChange={(e) => set("autoRotate", e.target.checked)}
              className="accent-or"
            />
            {t.autoRotate}
          </label>
          <Range
            label={t.viewAngle}
            value={s.viewAngle}
            min={-180}
            max={180}
            step={1}
            onChange={(v) => setS((prev) => ({ ...prev, viewAngle: v, autoRotate: false }))}
          />
          <label className="flex items-center gap-3 text-xs text-ink">
            <input
              type="checkbox"
              checked={s.debugCavity}
              onChange={(e) => set("debugCavity", e.target.checked)}
              className="accent-or"
            />
            {t.debugCavity}
          </label>
          <label className="flex items-center gap-3 text-xs text-ink">
            <input
              type="checkbox"
              checked={s.floor}
              onChange={(e) => set("floor", e.target.checked)}
              className="accent-or"
            />
            {t.floor}
          </label>
          <button
            type="button"
            onClick={() => {
              const { model: _model, ...preset } = s;
              void _model;
              navigator.clipboard?.writeText(JSON.stringify(preset, null, 2)).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
            className="label-mono self-start rounded-full border border-line-strong px-4 py-2 text-[0.625rem] text-ink hover:border-ink"
          >
            {copied ? t.copied : t.copy}
          </button>
        </Group>
        {/* Indice de défilement du panneau */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky -bottom-5 -mx-5 -mt-12 h-12 shrink-0 bg-linear-to-t from-surface to-transparent"
        />
      </form>
    </div>
  );
}
