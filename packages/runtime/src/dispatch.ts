import { randomUUID } from "node:crypto";
import {
  parseDapRequest,
  parseDapResult,
  type AgentManifest,
  type DapRequest,
  type DapResult,
  type PolicyDecision,
} from "@daniel-ai-os/contracts";
import { guardRequest } from "./policy-guard";
import { routeRequest, type RoutingDecision } from "./router";

export interface AgentExecutionEnv {
  repoRoot: string;
  mode: "dry-run";
  /** Azioni esplicitamente confermate dall'utente per questa richiesta. */
  confirmations: readonly string[];
}

/** Contratto tra runtime e agente di dominio. L'implementazione vive in agents/<id>/. */
export interface AgentExecutor {
  manifest: AgentManifest;
  execute(request: DapRequest, env: AgentExecutionEnv): DapResult;
}

export interface DispatchOptions {
  repoRoot: string;
  executors: AgentExecutor[];
  confirmations?: readonly string[];
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function result(request: DapRequest, partial: Partial<DapResult> & Pick<DapResult, "status" | "summary">): DapResult {
  return parseDapResult({ request_id: request.request_id, ...partial });
}

/** Valida → trova l'agente → applica la policy guard → esegue il workflow in dry-run. */
export function dispatch(input: unknown, options: DispatchOptions): DapResult {
  const request = parseDapRequest(input);
  const confirmations = options.confirmations ?? [];
  const executor = options.executors.find(
    (e) => same(e.manifest.id, request.target_agent) || same(e.manifest.name, request.target_agent),
  );
  if (!executor) {
    return result(request, {
      status: "failed",
      summary: `Nessun agente registrato per "${request.target_agent}".`,
      blockers: [`target_agent sconosciuto: ${request.target_agent}`],
    });
  }

  const guard = guardRequest(request, executor.manifest, confirmations);
  if (!guard.allowed) return blockedResult(request, guard.decisions);

  const executed = executor.execute(request, { repoRoot: options.repoRoot, mode: "dry-run", confirmations });
  // Il guard approva, ma nessun connettore esiste: le azioni confermate restano proposte.
  const confirmedActions = guard.decisions.filter((d) => d.confirmed).map((d) => d.action);
  if (confirmedActions.length) {
    executed.facts.push(
      `Conferma ricevuta per: ${confirmedActions.join(", ")}. MVP in dry-run senza connettori: nessuna azione eseguita.`,
    );
  }
  return parseDapResult(executed);
}

function blockedResult(request: DapRequest, decisions: PolicyDecision[]): DapResult {
  const denied = decisions.filter((d) => !d.allowed);
  return result(request, {
    status: "blocked",
    summary: `Richiesta bloccata: serve conferma esplicita per ${denied.map((d) => d.action).join(", ")}.`,
    facts: ["Policy guard applicata prima di qualsiasi esecuzione; nessuna azione è stata eseguita."],
    blockers: denied.map((d) => d.reason),
    actions_required: denied.map((d) => `Conferma esplicitamente l'azione "${d.action}" per procedere.`),
  });
}

export interface UserRequestOptions extends DispatchOptions {
  manifests: AgentManifest[];
  project_id?: string | null;
  idFactory?: () => string;
}

/** Lato DANIEL: testo libero → routing → DAP Request → dispatch. */
export function handleUserText(
  text: string,
  options: UserRequestOptions,
): { request: DapRequest; routing: RoutingDecision | null; result: DapResult } {
  const request_id = options.idFactory?.() ?? `req_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const routing = routeRequest(text, options.manifests);
  const request = parseDapRequest({
    request_id,
    type: "task",
    user_request: text,
    source_agent: "DANIEL",
    target_agent: routing?.target_agent ?? "DANIEL",
    project_id: options.project_id ?? null,
  });
  if (!routing) {
    return {
      request,
      routing,
      result: result(request, {
        status: "needs_input",
        summary: "Nessun agente di dominio riconosciuto per questa richiesta.",
        facts: ["Il router non ha trovato corrispondenze nei manifest registrati."],
        actions_required: ["Riformula la richiesta indicando il dominio (es. blog, articolo, SEO, social)."],
      }),
    };
  }
  return { request, routing, result: dispatch(request, options) };
}
