import {
  guardRequest,
  handleUserText,
  type AgentExecutor,
} from "@daniel-ai-os/runtime";
import { BASELINE_GUARDED_ACTIONS, type AgentManifest } from "@daniel-ai-os/contracts";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  type ChatResponse,
  type GuardedAction,
} from "../shared/ipc";
import { isTrustedUrl } from "./window";

export interface ChatDeps {
  repoRoot: string;
  manifests: AgentManifest[];
  executors: AgentExecutor[];
  /** URL file:// della pagina dell'app; solo i frame che la caricano possono invocare l'handler. */
  appUrl: string;
  log?: (error: unknown) => void;
}

const isGuarded = (a: string): a is GuardedAction => (BASELINE_GUARDED_ACTIONS as readonly string[]).includes(a);

const fail = (error: string): ChatResponse => ({ ok: false, error });

/**
 * Handler del canale IPC: valida mittente e payload, esegue il runtime DAP in dry-run
 * e restituisce solo una risposta riconvalidata. Non solleva mai verso la UI.
 */
export function createChatHandler(deps: ChatDeps) {
  return function handleChat(senderUrl: string | undefined, raw: unknown): ChatResponse {
    if (!isTrustedUrl(senderUrl, deps.appUrl)) return fail("Mittente non autorizzato.");

    const parsed = ChatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(`Richiesta non valida: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    const { message, options } = parsed.data;

    try {
      const { request, result } = handleUserText(message, {
        repoRoot: deps.repoRoot,
        manifests: deps.manifests,
        executors: deps.executors,
        confirmations: options.confirmations,
        project_id: options.projectId ?? null,
      });

      // Azioni che hanno bloccato la richiesta: ricavate dal guard del runtime, non duplicate qui.
      let pending: GuardedAction[] = [];
      if (result.status === "blocked") {
        const manifest = deps.manifests.find((m) => m.name.toLowerCase() === request.target_agent.toLowerCase());
        if (manifest) {
          pending = guardRequest(request, manifest, options.confirmations)
            .decisions.filter((d) => !d.allowed)
            .map((d) => d.action)
            .filter(isGuarded);
        }
      }

      const response = ChatResponseSchema.safeParse({ ok: true, result, pending_confirmations: pending });
      return response.success ? response.data : fail("Risposta del runtime non valida.");
    } catch (error) {
      deps.log?.(error);
      return fail("Errore interno durante l'elaborazione della richiesta.");
    }
  };
}
