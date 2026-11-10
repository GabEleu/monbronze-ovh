"use client";

import { useSyncExternalStore } from "react";
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/storage";

/**
 * Préférences du visiteur, lisibles partout sans provider :
 * - lite  : « Expérience allégée », mémorisée dans localStorage
 * - sound : son, coupé par défaut, mémorisé pour la session uniquement
 */
export type Preferences = { lite: boolean; sound: boolean };

const SERVER: Preferences = { lite: false, sound: false };
const listeners = new Set<() => void>();
let current: Preferences | null = null;

function snapshot(): Preferences {
  if (!current) {
    current = {
      lite: readStorage(STORAGE_KEYS.lite) === "1",
      sound: readStorage(STORAGE_KEYS.sound, "session") === "1",
    };
  }
  return current;
}

export function setPreferences(patch: Partial<Preferences>) {
  current = { ...snapshot(), ...patch };
  if (patch.lite !== undefined) writeStorage(STORAGE_KEYS.lite, patch.lite ? "1" : "0");
  if (patch.sound !== undefined)
    writeStorage(STORAGE_KEYS.sound, patch.sound ? "1" : "0", "session");
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER);
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(listener: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/** `prefers-reduced-motion`, réactif. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/** Mouvement réduit : préférence système OU expérience allégée. */
export function useCalmMode(): boolean {
  const { lite } = usePreferences();
  const reduced = useReducedMotion();
  return lite || reduced;
}

const CONTRAST = "(forced-colors: active), (prefers-contrast: more)";

function subscribeContrast(listener: () => void) {
  const mq = window.matchMedia(CONTRAST);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/**
 * Couleurs forcées (thème à contraste élevé) ou contraste accru demandé : la coulée WebGL
 * (titre en mode de fusion) est remplacée par la version statique, aux couleurs système.
 */
export function useHighContrast(): boolean {
  return useSyncExternalStore(
    subscribeContrast,
    () => window.matchMedia(CONTRAST).matches,
    () => false,
  );
}
