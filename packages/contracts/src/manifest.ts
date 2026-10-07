import { z } from "zod";
import { PermissionPolicySchema } from "./policy";

const MemoryPolicySchema = z
  .object({
    read_scopes: z.array(z.string()).default([]),
    write_scopes: z.array(z.string()).default([]),
    promotion_required: z.boolean().default(true),
  })
  .passthrough();

/** Parametri opzionali usati dal router generico; i manifest esistenti restano validi senza. */
const RoutingSchema = z
  .object({
    /** Parole chiave (case-insensitive). Un `*` finale indica prefisso: `articol*`. Le frasi sono ammesse. */
    keywords: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

/** Contenuto della chiave radice `agent:` di agents/<id>/agent.yaml (vedi templates/agent.yaml). */
export const AgentManifestSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().min(1),
    version: z.string().min(1),
    type: z.enum(["global", "domain", "project", "specialist"]),
    parent_agent: z.string().optional(),
    domain: z.string().optional(),
    description: z.string().default(""),
    mission: z.string().default(""),
    responsibilities: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    capabilities: z.array(z.string()).default([]),
    child_agents: z.array(z.string()).default([]),
    projects: z.array(z.string()).default([]),
    memory: MemoryPolicySchema.optional(),
    autonomy: z.enum(["low", "medium", "high"]).default("medium"),
    safeguards: PermissionPolicySchema.default({}),
    routing: RoutingSchema.optional(),
  })
  .passthrough();

export const AgentManifestFileSchema = z.object({ agent: AgentManifestSchema });

export type AgentManifest = z.infer<typeof AgentManifestSchema>;

/** Definizione di workflow (agents/<id>/workflows/*.yaml). */
export const WorkflowSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    trigger: z.string().min(1),
    input: z
      .object({ required: z.array(z.string()).default([]), optional: z.array(z.string()).default([]) })
      .default({}),
    steps: z.array(z.string().min(1)).min(1),
    outputs: z
      .object({
        status: z.array(z.string()).default([]),
        required_fields: z.array(z.string()).default([]),
      })
      .default({}),
    safeguards: z.object({ confirmation_required_for: z.array(z.string()).default([]) }).default({}),
  })
  .passthrough();
export const WorkflowFileSchema = z.object({ workflow: WorkflowSchema });
export type WorkflowDefinition = z.infer<typeof WorkflowSchema>;
