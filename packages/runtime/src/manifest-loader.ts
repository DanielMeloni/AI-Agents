import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  AgentManifestFileSchema,
  WorkflowFileSchema,
  type AgentManifest,
  type WorkflowDefinition,
} from "@daniel-ai-os/contracts";

function readYaml(path: string): unknown {
  try {
    return parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`Impossibile leggere ${path}: ${(e as Error).message}`);
  }
}

function formatIssues(path: string, issues: { path: PropertyKey[]; message: string }[]): Error {
  return new Error(`File non valido ${path}:\n- ${issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n- ")}`);
}

export function loadAgentManifest(path: string): AgentManifest {
  const parsed = AgentManifestFileSchema.safeParse(readYaml(path));
  if (!parsed.success) throw formatIssues(path, parsed.error.issues);
  return parsed.data.agent;
}

export function loadWorkflow(path: string): WorkflowDefinition {
  const parsed = WorkflowFileSchema.safeParse(readYaml(path));
  if (!parsed.success) throw formatIssues(path, parsed.error.issues);
  return parsed.data.workflow;
}

/** Carica ogni `agents/<id>/agent.yaml` presente; l'id nel manifest deve coincidere con la cartella. */
export function loadAgentManifests(repoRoot: string): AgentManifest[] {
  const agentsDir = join(repoRoot, "agents");
  const manifests: AgentManifest[] = [];
  for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(agentsDir, entry.name, "agent.yaml");
    if (!existsSync(file)) continue;
    const manifest = loadAgentManifest(file);
    if (manifest.id !== entry.name) {
      throw new Error(`${file}: id "${manifest.id}" diverso dalla cartella "${entry.name}"`);
    }
    manifests.push(manifest);
  }
  return manifests.sort((a, b) => a.id.localeCompare(b.id));
}
