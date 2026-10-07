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
