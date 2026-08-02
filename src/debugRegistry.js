import { useEffect } from "react";

/** Screen-scoped debug actions for ?fast=1 (DebugPanel reads this). */

let screen = "app";
/** @type {{ id: string, label: string, run: () => void }[]} */
let actions = [];
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

export function getDebugSnapshot() {
  return { screen, actions };
}

export function subscribeDebug(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Register actions for the current screen. Clears on unmount. Pass null screenId to skip. */
export function useDebugActions(screenId, nextActions) {
  useEffect(() => {
    if (!screenId) return undefined;
    screen = screenId;
    actions = Array.isArray(nextActions) ? nextActions : [];
    emit();
    return () => {
      if (screen === screenId) {
        screen = "app";
        actions = [];
        emit();
      }
    };
  }, [screenId, nextActions]);
}
