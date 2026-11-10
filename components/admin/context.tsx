"use client";

import { createContext, useContext, useEffect } from "react";
import { admin } from "@/content/admin";
import { AdminError } from "@/lib/admin/client";

/**
 * Liens entre les onglets et l'application d'administration : saisies non enregistrées
 * (avertissement avant de quitter) et session expirée (reconnexion sur place, sans perdre
 * les saisies).
 */
export type AdminContextValue = {
  setDirty: (panel: string, dirty: boolean) => void;
  sessionExpired: () => void;
};

export const AdminContext = createContext<AdminContextValue>({
  setDirty: () => undefined,
  sessionExpired: () => undefined,
});

/** Signale à l'application qu'un onglet a des modifications non enregistrées. */
export function useDirty(panel: string, dirty: boolean) {
  const { setDirty } = useContext(AdminContext);
  useEffect(() => {
    setDirty(panel, dirty);
    return () => setDirty(panel, false);
  }, [panel, dirty, setDirty]);
}

/**
 * Messages d'erreur lisibles (en français, champs nommés comme à l'écran). Une session
 * expirée ouvre la reconnexion sur place.
 */
export function useErrorMessages() {
  const { sessionExpired } = useContext(AdminContext);
  return (error: unknown): string[] => {
    if (error instanceof AdminError) {
      if (error.status === 401) {
        sessionExpired();
        return [admin.common.sessionExpired];
      }
      return [`${admin.common.error} ${error.message}`, ...error.details];
    }
    return [`${admin.common.error} ${error instanceof Error ? error.message : String(error)}`];
  };
}

/** Message d'état affiché À CÔTÉ du bouton (visible même en bas d'une longue page). */
export function SaveStatus({ messages, ok }: { messages: string[]; ok: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1 text-sm text-ink">
      {ok && <p className="font-medium">{ok}</p>}
      {messages.map((m) => (
        <p key={m} className="font-medium">
          {m}
        </p>
      ))}
    </div>
  );
}
