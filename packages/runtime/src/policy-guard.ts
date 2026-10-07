import {
  BASELINE_GUARDED_ACTIONS,
  type AgentManifest,
  type DapRequest,
  type PolicyDecision,
} from "@daniel-ai-os/contracts";

/** Azioni protette per un agente: baseline di sistema + eventuali extra del manifest. */
export function guardedActions(manifest: Pick<AgentManifest, "safeguards">): string[] {
  return [...new Set<string>([...BASELINE_GUARDED_ACTIONS, ...manifest.safeguards.require_confirmation_for])];
}

const CHANGE_VERB = /(modific|aggiorn|cambi|sposta|riprogramm|aggiung|rimand|change|update|reschedule|move|add)/iu;
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  publish: [/(?<![\p{L}\p{N}])(pubblic\w*|publish\w*|metti\w* online|go live)/iu],
  external_write: [
    /(scriv\w+|salv\w+|carica\w*|aggiorn\w+|modific\w+|upload\w*|write)\s+.{0,40}(wordpress|drive|database|db\b|sito)/iu,
  ],
  delete: [/(?<![\p{L}\p{N}])(elimin\w*|cancell\w*|rimuov\w*|delete\w*|remove\w*)/iu],
};
const PLAN = /(piano|calendario)\s+editorial\w*|editorial\s+(plan|calendar)/iu;

/**
 * Euristica deliberatamente prudente: preferisce un falso blocco a un'azione non confermata.
 * `requested_action` esplicito ha precedenza sull'analisi del testo.
 */
export function detectRequestedActions(request: Pick<DapRequest, "user_request" | "requested_action">): string[] {
  const found = new Set<string>();
  const explicit = request.requested_action.trim().toLowerCase();
  if (explicit) found.add(explicit);
  const text = request.user_request;
  for (const [action, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) found.add(action);
  }
  if (PLAN.test(text) && CHANGE_VERB.test(text)) found.add("editorial_plan_change");
  return [...found];
}

export function evaluateAction(
  action: string,
  manifest: Pick<AgentManifest, "safeguards">,
  confirmations: readonly string[] = [],
): PolicyDecision {
  const guarded = guardedActions(manifest).includes(action);
  const confirmed = confirmations.includes(action);
  if (!guarded) {
    return { action, allowed: true, requires_confirmation: false, confirmed, reason: "Azione non soggetta a conferma." };
  }
  return confirmed
    ? { action, allowed: true, requires_confirmation: true, confirmed, reason: `Conferma esplicita ricevuta per "${action}".` }
    : { action, allowed: false, requires_confirmation: true, confirmed, reason: `"${action}" richiede conferma esplicita.` };
}

export function guardRequest(
  request: Pick<DapRequest, "user_request" | "requested_action">,
  manifest: Pick<AgentManifest, "safeguards">,
  confirmations: readonly string[] = [],
): { allowed: boolean; decisions: PolicyDecision[] } {
  const decisions = detectRequestedActions(request).map((a) => evaluateAction(a, manifest, confirmations));
  return { allowed: decisions.every((d) => d.allowed), decisions };
}
