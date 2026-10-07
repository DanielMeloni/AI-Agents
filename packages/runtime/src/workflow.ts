import type { DapResult, WorkflowDefinition } from "@daniel-ai-os/contracts";

export type ExecutionMode = "dry-run";

/** Un handler per step: riceve lo stato corrente e ritorna le modifiche da applicare. */
export type StepHandler<S> = (state: Readonly<S>) => Partial<S> | void;

export interface WorkflowRun<S> {
  state: S;
  trace: string[];
  mode: ExecutionMode;
}

/**
 * Esecutore generico: esegue in ordine gli step dichiarati dal workflow YAML.
 * Gli handler (logica di dominio) sono forniti dall'agente; qui non c'è alcuna logica specifica.
 * Solo modalità dry-run: gli handler non ricevono connettori né possono produrre effetti esterni.
 */
export function runWorkflow<S extends object>(
  workflow: WorkflowDefinition,
  handlers: Record<string, StepHandler<S>>,
  initial: S,
  mode: ExecutionMode = "dry-run",
): WorkflowRun<S> {
  const missing = workflow.steps.filter((s) => !handlers[s]);
  if (missing.length) throw new Error(`Workflow ${workflow.id}: handler mancanti per gli step ${missing.join(", ")}`);
  const unknown = Object.keys(handlers).filter((h) => !workflow.steps.includes(h));
  if (unknown.length) throw new Error(`Workflow ${workflow.id}: handler non dichiarati nel workflow: ${unknown.join(", ")}`);

  let state = initial;
  const trace: string[] = [];
  for (const step of workflow.steps) {
    state = { ...state, ...(handlers[step]!(state) ?? {}) };
    trace.push(step);
  }
  return { state, trace, mode };
}

/** Verifica che il risultato rispetti `outputs` dichiarato nel workflow. */
export function assertWorkflowOutputs(workflow: WorkflowDefinition, result: DapResult): void {
  const { status, required_fields } = workflow.outputs;
  if (status.length && !status.includes(result.status)) {
    throw new Error(`Workflow ${workflow.id}: status "${result.status}" non ammesso (${status.join(", ")})`);
  }
  const absent = required_fields.filter((f) => !(f in result));
  if (absent.length) throw new Error(`Workflow ${workflow.id}: campi obbligatori assenti: ${absent.join(", ")}`);
}
