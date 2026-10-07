import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Risale dalle directory fino alla radice del monorepo (pnpm-workspace.yaml). */
export function findRepoRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Radice del monorepo non trovata a partire da ${from}`);
    dir = parent;
  }
}
