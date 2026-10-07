import { z } from "zod";

/** DAP v1.0 — vedi docs/dap.md. */
export const DAP_VERSION = "1.0";

export const REQUEST_TYPES = ["task", "routing", "review", "handoff"] as const;
export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const RESULT_STATUSES = ["completed", "needs_input", "blocked", "handed_off", "failed"] as const;
export const MEMORY_SCOPES = ["global", "domain", "project", "session"] as const;

const refs = z.array(z.string().min(1));

export const DapHandoffSchema = z
  .object({
    target_agent: z.string().min(1),
    reason: z.string().min(1),
    project_id: z.string().min(1).nullable().default(null),
    context_refs: refs.default([]),
    requested_action: z.string().default(""),
  })
  .strict();

export const DapRequestSchema = z
  .object({
    request_id: z.string().regex(/^req_[A-Za-z0-9_-]+$/, "request_id deve avere forma req_..."),
    type: z.enum(REQUEST_TYPES),
    user_request: z.string().trim().min(1),
    source_agent: z.string().min(1),
    target_agent: z.string().min(1),
    project_id: z.string().min(1).nullable().default(null),
    priority: z.enum(PRIORITIES).default("normal"),
    /** Riferimenti risolvibili, mai copie di documenti. */
    context_refs: refs.default([]),
    constraints: z.array(z.string()).default([]),
    requested_action: z.string().default(""),
  })
  .strict();

/** Proposta di aggiornamento memoria: DANIEL la valida prima della promozione. */
export const MemoryUpdateSchema = z
  .object({
    owner: z.string().min(1),
    scope: z.enum(MEMORY_SCOPES),
    evidence: z.string().min(1),
    reason: z.string().min(1),
    content: z.string().min(1),
  })
  .strict();

const items = z.union([z.string(), z.record(z.string(), z.unknown())]);

export const DapResultSchema = z
  .object({
    request_id: z.string().regex(/^req_[A-Za-z0-9_-]+$/),
    status: z.enum(RESULT_STATUSES),
    summary: z.string().min(1),
    facts: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    decisions: z.array(z.string()).default([]),
    actions_completed: z.array(z.string()).default([]),
    actions_required: z.array(z.string()).default([]),
    blockers: z.array(z.string()).default([]),
    artifacts: z.array(items).default([]),
    memory_updates: z.array(MemoryUpdateSchema).default([]),
    handoff: DapHandoffSchema.nullable().default(null),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.status === "handed_off" && !r.handoff) {
      ctx.addIssue({ code: "custom", path: ["handoff"], message: "status handed_off richiede un handoff" });
    }
    if (r.status === "blocked" && r.blockers.length === 0) {
      ctx.addIssue({ code: "custom", path: ["blockers"], message: "status blocked richiede almeno un blocker" });
    }
  });

export type DapRequest = z.infer<typeof DapRequestSchema>;
export type DapResult = z.infer<typeof DapResultSchema>;
export type DapHandoff = z.infer<typeof DapHandoffSchema>;
export type MemoryUpdate = z.infer<typeof MemoryUpdateSchema>;
/** Input accettato prima dell'applicazione dei default. */
export type DapRequestInput = z.input<typeof DapRequestSchema>;
export type DapResultInput = z.input<typeof DapResultSchema>;

export class DapValidationError extends Error {
  constructor(
    readonly kind: string,
    readonly issues: string[],
  ) {
    super(`${kind} DAP non valido:\n- ${issues.join("\n- ")}`);
    this.name = "DapValidationError";
  }
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: string[] };

function run<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): ValidationResult<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}

function orThrow<T>(kind: string, r: ValidationResult<T>): T {
  if (!r.ok) throw new DapValidationError(kind, r.issues);
  return r.value;
}

export const validateDapRequest = (input: unknown) => run(DapRequestSchema, input);
export const validateDapResult = (input: unknown) => run(DapResultSchema, input);
export const validateDapHandoff = (input: unknown) => run(DapHandoffSchema, input);

export const parseDapRequest = (input: unknown): DapRequest => orThrow("Request", validateDapRequest(input));
export const parseDapResult = (input: unknown): DapResult => orThrow("Result", validateDapResult(input));
export const parseDapHandoff = (input: unknown): DapHandoff => orThrow("Handoff", validateDapHandoff(input));
