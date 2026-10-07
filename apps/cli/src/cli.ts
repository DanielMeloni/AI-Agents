import type { DapResult } from "@daniel-ai-os/contracts";
import { createBlackstarExecutor } from "@daniel-ai-os/blackstar";
import { findRepoRoot, handleUserText, loadAgentManifests } from "@daniel-ai-os/runtime";

export interface CliArgs {
  text: string;
  confirmations: string[];
  projectId: string | null;
  root?: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { text: "", confirmations: [], projectId: null };
  const words: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`Valore mancante per ${a}`);
      return v;
    };
    if (a === "--confirm") args.confirmations.push(next());
    else if (a === "--project") args.projectId = next();
    else if (a === "--root") args.root = next();
    else if (a.startsWith("--")) throw new Error(`Opzione sconosciuta: ${a}`);
    else words.push(a);
  }
  args.text = words.join(" ").trim();
  return args;
}

/** Esegue una richiesta in dry-run locale e ritorna il DAP Result. */
export function runCli(argv: string[]): DapResult {
  const args = parseArgs(argv);
  if (!args.text) throw new Error('Uso: pnpm demo "<richiesta>" [--confirm <azione>] [--project <id>]');
  const repoRoot = args.root ?? findRepoRoot();
  const manifests = loadAgentManifests(repoRoot);
  const executors = manifests.filter((m) => m.id === "blackstar").map(createBlackstarExecutor);
  return handleUserText(args.text, {
    repoRoot,
    manifests,
    executors,
    confirmations: args.confirmations,
    project_id: args.projectId,
  }).result;
}
