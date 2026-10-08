import type { DapResult } from "../shared/ipc";

export const MASCOT_STATES = ["idle", "listening", "working", "responding", "blocked"] as const;
export type MascotState = (typeof MASCOT_STATES)[number];

export function setMascotState(el: Element, state: MascotState): void {
  el.setAttribute("data-state", state);
}

/** Stato visivo da mostrare quando arriva un risultato. */
export function mascotStateForStatus(status: DapResult["status"]): MascotState {
  return status === "blocked" || status === "failed" ? "blocked" : "responding";
}

/** Durata dell'animazione "parla": proporzionale alla lunghezza della risposta, limitata. */
export function speakingMs(summary: string): number {
  return Math.min(6000, Math.max(1800, summary.length * 35));
}
