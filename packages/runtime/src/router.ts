import type { AgentManifest } from "@daniel-ai-os/contracts";

export interface RoutingDecision {
  target_agent: string;
  agent_id: string;
  matched_keywords: string[];
  score: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `articol*` → prefisso; altrimenti parola/frase intera. Case-insensitive, Unicode-aware. */
function keywordRegex(keyword: string): RegExp {
  const prefix = keyword.endsWith("*");
  const body = escape((prefix ? keyword.slice(0, -1) : keyword).trim()).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${prefix ? "" : "(?![\\p{L}\\p{N}])"}`, "iu");
}

/**
 * Router iniziale basato solo sui manifest: ogni agente di dominio dichiara `routing.keywords`.
 * Nessuna conoscenza di uno specifico agente vive qui. Ritorna null se nessun agente corrisponde.
 */
export function routeRequest(userRequest: string, manifests: AgentManifest[]): RoutingDecision | null {
  let best: RoutingDecision | null = null;
  for (const m of manifests) {
    if (m.type !== "domain") continue;
    const matched = (m.routing?.keywords ?? []).filter((k) => keywordRegex(k).test(userRequest));
    if (matched.length === 0) continue;
    if (!best || matched.length > best.score) {
      best = { target_agent: m.name, agent_id: m.id, matched_keywords: matched, score: matched.length };
    }
  }
  return best;
}
