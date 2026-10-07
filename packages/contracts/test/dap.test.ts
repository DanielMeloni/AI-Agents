import { describe, expect, it } from "vitest";
import { parseDapRequest, validateDapRequest, validateDapResult } from "../src";

const valid = {
  request_id: "req_001",
  type: "task",
  user_request: "Proponi un articolo su Dataform per il mio blog",
  source_agent: "DANIEL",
  target_agent: "BLACKSTAR",
};

describe("DAP request validation", () => {
  it("accetta una request valida e applica i default del protocollo", () => {
    const r = parseDapRequest(valid);
    expect(r).toMatchObject({ project_id: null, priority: "normal", context_refs: [], constraints: [], requested_action: "" });
  });

  it("rifiuta campi mancanti, valori fuori enum e campi sconosciuti", () => {
    const res = validateDapRequest({ ...valid, request_id: "x", type: "boh", user_request: " ", extra: 1, target_agent: undefined });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      const text = res.issues.join("\n");
      for (const f of ["request_id", "type", "user_request", "target_agent", "extra"]) expect(text).toContain(f);
    }
  });

  it("richiede un handoff coerente con status handed_off", () => {
    const res = validateDapResult({ request_id: "req_001", status: "handed_off", summary: "x" });
    expect(res.ok).toBe(false);
  });
});
