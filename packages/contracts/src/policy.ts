import { z } from "zod";

/**
 * Azioni che richiedono sempre conferma esplicita, indipendentemente dal manifest.
 * I manifest possono solo aggiungerne altre (es. financial_action), non rimuoverle.
 */
export const BASELINE_GUARDED_ACTIONS = ["publish", "external_write", "delete", "editorial_plan_change"] as const;
export type BaselineGuardedAction = (typeof BASELINE_GUARDED_ACTIONS)[number];

export const PermissionPolicySchema = z
  .object({
    /** Azioni bloccate finché non c'è una conferma esplicita. */
    require_confirmation_for: z.array(z.string().min(1)).default([]),
  })
  .passthrough();
export type PermissionPolicy = z.infer<typeof PermissionPolicySchema>;

export interface PolicyDecision {
  action: string;
  allowed: boolean;
  /** true se l'azione è protetta (anche quando è stata confermata). */
  requires_confirmation: boolean;
  confirmed: boolean;
  reason: string;
}
