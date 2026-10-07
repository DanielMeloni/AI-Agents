import { join } from "node:path";
import type { AgentManifest, DapRequest, DapResult, WorkflowDefinition } from "@daniel-ai-os/contracts";
import { parseDapResult } from "@daniel-ai-os/contracts";
import {
  assertWorkflowOutputs,
  loadWorkflow,
  runWorkflow,
  type AgentExecutor,
  type StepHandler,
} from "@daniel-ai-os/runtime";

type Kind = "article_proposal" | "seo_request" | "social_request" | "plan_request" | "unknown";
type Channel = "blog" | "linkedin" | "newsletter" | null;

interface IntakeState {
  request: DapRequest;
  manifest: AgentManifest;
  kind: Kind;
  channel: Channel;
  topic: string | null;
  projectId: string | null;
  assumptions: string[];
  contextRefs: string[];
  missing: string[];
  needsHandoff: boolean;
  result?: DapResult;
}

const has = (text: string, re: RegExp) => re.test(text);

const TOPIC =
  /(?<![\p{L}\p{N}])(?:su|sul|sulla|sullo|sull'|sui|sugli|sulle|about|on)\s+(.+?)(?=\s+(?:per|for)\s+(?:il|la|lo|i|le|my|the)(?![\p{L}\p{N}])|[.?!]?$)/iu;

/** Step del workflow `blackstar-editorial-intake`. Funzioni pure: nessun I/O, nessun effetto esterno. */
const handlers: Record<string, StepHandler<IntakeState>> = {
  classify_request({ request }) {
    const text = request.user_request;
    const kind: Kind = has(text, /(?<![\p{L}\p{N}])(articol\w*|post|blog)/iu) && has(text, /(propon\w*|suggerisc\w*|idea|proposta|propose|suggest)/iu)
      ? "article_proposal"
      : has(text, /(?<![\p{L}\p{N}])seo/iu)
        ? "seo_request"
        : has(text, /(?<![\p{L}\p{N}])(social|linkedin)/iu)
          ? "social_request"
          : has(text, /(piano|calendario)\s+editorial\w*/iu)
            ? "plan_request"
            : "unknown";
    const fromConstraint = request.constraints.find((c) => c.startsWith("target_channel:"))?.slice("target_channel:".length);
    const channel: Channel =
      fromConstraint === "blog" || fromConstraint === "linkedin" || fromConstraint === "newsletter"
        ? fromConstraint
        : has(text, /(?<![\p{L}\p{N}])blog/iu)
          ? "blog"
          : has(text, /linkedin/iu)
            ? "linkedin"
            : has(text, /newsletter/iu)
              ? "newsletter"
              : null;
    const topic = TOPIC.exec(text)?.[1]?.trim() || null;
    const needsHandoff = has(text, /(wordpress|plugin|implementa\w*|codice|deploy)/iu);
    return { kind, channel, topic, needsHandoff };
  },

  resolve_project({ request, manifest, channel, assumptions }) {
    if (request.project_id) {
      return manifest.projects.includes(request.project_id)
        ? { projectId: request.project_id }
        : { projectId: null, assumptions: [...assumptions, `project_id "${request.project_id}" non è gestito da BLACKSTAR.`] };
    }
    if (channel === "blog" && manifest.projects.includes("personal-blog")) {
      return { projectId: "personal-blog", assumptions: [...assumptions, 'Progetto assunto dal canale "blog": personal-blog.'] };
    }
    return { projectId: null };
  },

  load_minimum_context({ request, projectId }) {
    // Solo riferimenti: i documenti non vengono letti né copiati.
    const projectRefs = projectId ? [`projects/${projectId}/project.yaml`, `projects/${projectId}/decisions.md`] : [];
    return { contextRefs: [...new Set([...request.context_refs, ...projectRefs])] };
  },

  identify_missing_information({ kind, topic, projectId, channel }) {
    const missing: string[] = [];
    if (kind === "unknown") missing.push("Tipo di richiesta editoriale (articolo, SEO, social, piano editoriale).");
    if (kind === "article_proposal" && !topic) missing.push("Argomento dell'articolo.");
    if (!projectId) missing.push("Progetto di riferimento (es. personal-blog).");
    if (!channel) missing.push("Canale di destinazione (blog, LinkedIn, newsletter).");
    return { missing };
  },

  produce_dap_result(state) {
    const { request, manifest, kind, channel, topic, projectId, assumptions, contextRefs, missing, needsHandoff } = state;
    const base = {
      request_id: request.request_id,
      facts: [
        `Richiesta classificata come: ${kind}.`,
        `Argomento: ${topic ?? "non identificato"}; canale: ${channel ?? "non identificato"}; progetto: ${projectId ?? "non risolto"}.`,
        "Esecuzione locale in dry-run: nessuna fonte esterna consultata e nessuna azione eseguita.",
      ],
      assumptions: [...assumptions, "Nessun contenuto esistente del blog è stato verificato: la sovrapposizione con articoli già pubblicati è ignota."],
      decisions: [] as string[],
      actions_completed: ["Intake editoriale eseguito in dry-run."],
      memory_updates: [],
    };

    if (needsHandoff) {
      return {
        result: parseDapResult({
          ...base,
          status: "handed_off",
          summary: "La richiesta include implementazione tecnica: passata a DEV tramite handoff.",
          actions_required: ["DEV valuta l'implementazione tecnica richiesta."],
          handoff: {
            target_agent: "DEV",
            reason: "Implementazione tecnica necessaria",
            project_id: projectId,
            context_refs: contextRefs,
            requested_action: request.user_request,
          },
        }),
      };
    }

    if (kind !== "article_proposal" || !topic) {
      return {
        result: parseDapResult({
          ...base,
          status: "needs_input",
          summary: "Servono più informazioni per procedere con l'intake editoriale.",
          actions_required: missing.length ? missing.map((m) => `Fornisci: ${m}`) : ["Precisa la richiesta editoriale."],
        }),
      };
    }

    const confirmations = manifest.safeguards.require_confirmation_for;
    return {
      result: parseDapResult({
        ...base,
        status: "completed",
        summary: `Proposta editoriale preliminare su "${topic}"${channel ? ` per il canale ${channel}` : ""}.`,
        actions_required: [
          ...missing.map((m) => `Fornisci: ${m}`),
          "Chiarisci pubblico di riferimento, taglio (tutorial o approfondimento) e parola chiave SEO principale.",
          ...(confirmations.includes("editorial_plan_change")
            ? ['Per inserire la proposta nel piano editoriale serve conferma esplicita ("editorial_plan_change").']
            : []),
          ...(confirmations.includes("publish") ? ['La pubblicazione richiede conferma esplicita ("publish").'] : []),
        ],
        artifacts: [
          {
            kind: "editorial_proposal",
            status: "draft",
            topic,
            channel,
            project_id: projectId,
            working_title: `${topic}: guida pratica (titolo provvisorio)`,
            outline: [
              `Problema e contesto: perché ${topic}`,
              `Concetti chiave di ${topic}`,
              "Esempio pratico passo-passo",
              "Errori comuni e buone pratiche",
              "Conclusioni e prossimi passi",
            ],
            note: "Struttura generata da template locale, senza LLM.",
            context_refs: contextRefs,
          },
        ],
      }),
    };
  },
};

export function createBlackstarExecutor(manifest: AgentManifest): AgentExecutor {
  return {
    manifest,
    execute(request, env) {
      const workflow: WorkflowDefinition = loadWorkflow(
        join(env.repoRoot, "agents", manifest.id, "workflows", "editorial-intake.yaml"),
      );
      const { state } = runWorkflow<IntakeState>(
        workflow,
        handlers,
        {
          request,
          manifest,
          kind: "unknown",
          channel: null,
          topic: null,
          projectId: null,
          assumptions: [],
          contextRefs: [],
          missing: [],
          needsHandoff: false,
        },
        env.mode,
      );
      if (!state.result) throw new Error("editorial-intake non ha prodotto un risultato");
      assertWorkflowOutputs(workflow, state.result);
      return state.result;
    },
  };
}
