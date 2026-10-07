import { describe, expect, it } from "vitest";
import { validateDapResult } from "@daniel-ai-os/contracts";
import { runCli } from "../src/cli";

describe("BLACKSTAR editorial intake (end-to-end locale)", () => {
  it("produce un DAP Result valido per una proposta di articolo", () => {
    const result = runCli(["Proponi un articolo su Dataform per il mio blog"]);
    expect(validateDapResult(result).ok).toBe(true);
    expect(result.status).toBe("completed");
    expect(result.summary).toContain("Dataform");
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.actions_completed.join(" ")).not.toMatch(/pubblicat|scritt/i);
    expect(result.artifacts[0]).toMatchObject({ kind: "editorial_proposal", topic: "Dataform", project_id: "personal-blog" });
    expect(result.blockers).toEqual([]);
  });

  it("blocca la pubblicazione senza conferma e non esegue il workflow", () => {
    const result = runCli(["Pubblica l'articolo su Dataform sul blog"]);
    expect(validateDapResult(result).ok).toBe(true);
    expect(result.status).toBe("blocked");
    expect(result.blockers[0]).toContain("publish");
    expect(result.artifacts).toEqual([]);
  });

  it("con conferma esplicita non esegue comunque azioni esterne (nessun connettore)", () => {
    const result = runCli(["Pubblica l'articolo su Dataform sul blog", "--confirm", "publish"]);
    expect(result.status).not.toBe("blocked");
    expect(result.facts.join(" ")).toContain("nessuna azione eseguita");
  });

  it("chiede input se manca l'argomento", () => {
    const result = runCli(["Proponi un articolo per il mio blog"]);
    expect(result.status).toBe("needs_input");
  });

  it("restituisce needs_input se nessun agente è competente", () => {
    expect(runCli(["Quanto costa un volo per Roma?"]).status).toBe("needs_input");
  });

  it("crea un handoff a DEV per richieste di implementazione", () => {
    const result = runCli(["Implementa un plugin WordPress per il blog"]);
    expect(result.status).toBe("handed_off");
    expect(result.handoff?.target_agent).toBe("DEV");
  });
});
