"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { admin } from "@/content/admin";
import { adminApi, AdminError } from "@/lib/admin/client";
import { Field, inputClass, pillClass } from "@/components/admin/fields";
import { AdminContext, type AdminContextValue } from "@/components/admin/context";
import { RealisationsPanel } from "@/components/admin/RealisationsPanel";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { AtelierPanel } from "@/components/admin/AtelierPanel";
import { PagesPanel } from "@/components/admin/PagesPanel";
import type { AdminData } from "@/components/admin/types";

type Tab = "realisations" | "atelier" | "pages";

/** Formulaire de connexion (première connexion, ou reconnexion sur place). */
function LoginForm({ intro, onDone }: { intro?: string; onDone: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await adminApi("POST", "/api/admin/session", { password });
      setPassword("");
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="flex max-w-sm flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-h3 font-serif">{admin.login.title}</h2>
      {intro && (
        <p role="alert" className="font-medium text-ink">
          {intro}
        </p>
      )}
      <Field label={admin.login.password}>
        {(p) => (
          <input
            {...p}
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-sm font-medium text-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="label-mono min-h-10 self-start rounded-full bg-ink px-6 py-3 text-surface"
      >
        {pending ? admin.login.pending : admin.login.submit}
      </button>
    </form>
  );
}

/** Première connexion : code d'installation + choix du mot de passe (dans le navigateur). */
function SetupForm({ onDone }: { onDone: () => Promise<void> }) {
  const t = admin.setup;
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setError(null);
    if (password.length < 12) return setError(t.tooShort);
    if (password !== confirm) return setError(t.mismatch);
    setPending(true);
    try {
      await adminApi("POST", "/api/admin/setup", { code, password });
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className="flex max-w-md flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-h3 font-serif">{t.title}</h2>
      <p className="text-ink-muted">{t.intro}</p>
      <Field label={t.code} hint={t.codeHint}>
        {(p) => (
          <input
            {...p}
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
      </Field>
      <Field label={t.password} hint={t.passwordHint}>
        {(p) => (
          <input
            {...p}
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <Field label={t.confirm}>
        {(p) => (
          <input
            {...p}
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-sm font-medium text-ink">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="label-mono min-h-10 self-start rounded-full bg-ink px-6 py-3 text-surface"
      >
        {pending ? admin.login.pending : t.submit}
      </button>
    </form>
  );
}

/**
 * Espace d'administration (/admin) : connexion, puis trois onglets. Tout passe par
 * /api/admin/* (session, contenu, médias) ; le site se met à jour sans reconstruction.
 * Les saisies ne se perdent pas : onglets toujours montés, avertissement avant de quitter
 * la page, reconnexion sur place si la session expire.
 */
export function AdminApp() {
  const [phase, setPhase] = useState<"loading" | "disabled" | "setup" | "login" | "ready">(
    "loading",
  );
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>("realisations");
  const [expired, setExpired] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [dirtyPanels, setDirtyPanels] = useState<string[]>([]);
  const dirty = dirtyPanels.length > 0;
  const tabsId = useId();

  const load = useCallback(async () => {
    try {
      setData(await adminApi<AdminData>("GET", "/api/admin/content"));
      setPhase("ready");
      setExpired(false);
    } catch (e) {
      if (e instanceof AdminError && e.status === 401) setPhase("login");
      else if (e instanceof AdminError && e.status === 503) setPhase("disabled");
      else setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await adminApi<{
        configured: boolean;
        needsSetup?: boolean;
        authenticated: boolean;
      }>("GET", "/api/admin/session").catch(() => ({
        configured: false,
        needsSetup: false,
        authenticated: false,
      }));
      if (!s.configured) setPhase("disabled");
      else if (s.needsSetup) setPhase("setup");
      else if (!s.authenticated) setPhase("login");
      else await load();
    })();
  }, [load]);

  // Saisies non enregistrées : avertissement avant de fermer, recharger ou suivre un lien.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    // Phase de capture sur window : avant l'écouteur des transitions de page du site.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(admin.common.confirmLeave)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const context = useMemo<AdminContextValue>(
    () => ({
      setDirty: (panel, isDirty) =>
        setDirtyPanels((list) => {
          const has = list.includes(panel);
          if (isDirty === has) return list;
          return isDirty ? [...list, panel] : list.filter((p) => p !== panel);
        }),
      sessionExpired: () => setExpired(true),
    }),
    [],
  );

  const logout = async () => {
    if (dirty && !window.confirm(admin.common.confirmLeave)) return;
    await adminApi("DELETE", "/api/admin/session").catch(() => undefined);
    setDirtyPanels([]);
    setData(null);
    setPhase("login");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "realisations", label: admin.tabs.realisations },
    { id: "atelier", label: admin.tabs.atelier },
    { id: "pages", label: admin.tabs.pages },
  ];

  return (
    <AdminContext.Provider value={context}>
      <div className="flex flex-col gap-10">
        {phase === "loading" && <p className="text-ink-muted">{admin.loading}</p>}
        {phase === "disabled" && <p className="max-w-xl text-ink">{admin.disabled}</p>}
        {loadError && (
          <p role="alert" className="font-medium text-ink">
            {loadError}
          </p>
        )}
        {phase === "setup" && <SetupForm onDone={load} />}
        {phase === "login" && <LoginForm onDone={load} />}

        {phase === "ready" && data && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              {/* Avertissement de sortie : écouteur en phase de capture sur window (ci-dessus). */}
              <TransitionLink href="/" className="label-mono text-ink underline underline-offset-4">
                {admin.viewSite}
              </TransitionLink>
              {dirty && (
                <span className="label-mono rounded-full border border-line-strong px-3 py-1 text-ink">
                  {admin.common.unsaved}
                </span>
              )}
              <button
                type="button"
                onClick={() => void logout()}
                className={`${pillClass} ml-auto`}
              >
                {admin.logout}
              </button>
            </div>
            {expired && (
              <div className="rounded-md border border-line-strong p-6">
                <LoginForm
                  intro={admin.common.sessionExpired}
                  onDone={async () => setExpired(false)}
                />
              </div>
            )}
            {!data.writable && (
              <p role="alert" className="font-medium text-ink">
                {admin.readOnly}
              </p>
            )}
            <div role="tablist" aria-label={admin.title} className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls={`${tabsId}-${t.id}-panel`}
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                    const i = tabs.findIndex((x) => x.id === tab);
                    const next =
                      tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]!;
                    setTab(next.id);
                    document.getElementById(`${tabsId}-${next.id}`)?.focus();
                  }}
                  className={
                    tab === t.id
                      ? "label-mono min-h-10 rounded-full bg-ink px-5 py-2 text-surface"
                      : `${pillClass} px-5`
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Les trois onglets restent montés (masqués) : une saisie en cours n'est jamais
                perdue en changeant d'onglet. */}
            {tabs.map((t) => (
              <div
                key={t.id}
                role="tabpanel"
                id={`${tabsId}-${t.id}-panel`}
                aria-labelledby={`${tabsId}-${t.id}`}
                hidden={tab !== t.id}
                tabIndex={0}
              >
                {t.id === "realisations" && <RealisationsPanel data={data} onSaved={load} />}
                {t.id === "atelier" && <AtelierPanel initial={data.atelier} onSaved={load} />}
                {t.id === "pages" && <PagesPanel initial={data.pages} onSaved={load} />}
              </div>
            ))}
          </>
        )}
      </div>
    </AdminContext.Provider>
  );
}
