import { describe, expect, it } from "vitest";
import { findRepoRoot, guardRequest, loadAgentManifests, routeRequest } from "../src";

const root = findRepoRoot(__dirname);
const manifests = loadAgentManifests(root);
const blackstar = manifests.find((m) => m.id === "blackstar")!;

describe("manifest loader", () => {
  it("carica i manifest esistenti (daniel e blackstar)", () => {
    expect(manifests.map((m) => m.id)).toEqual(["blackstar", "daniel"]);
  });
});

describe("router", () => {
  it.each([
    "Proponi un articolo su Dataform per il mio blog",
    "Prepara un post LinkedIn sul lancio",
    "Migliora la SEO del mio sito danielmeloni.com",
  ])("instrada a BLACKSTAR: %s", (text) => {
    expect(routeRequest(text, manifests)).toMatchObject({ agent_id: "blackstar", target_agent: "BLACKSTAR" });
  });

  it("non instrada richieste fuori dominio", () => {
    expect(routeRequest("Quanto costa un volo per Roma?", manifests)).toBeNull();
  });
});

describe("policy guard", () => {
  it.each([
    ["Pubblica l'articolo sul blog", "publish"],
    ["Elimina il vecchio post", "delete"],
    ["Aggiorna il piano editoriale di novembre", "editorial_plan_change"],
    ["Salva la bozza su WordPress", "external_write"],
  ])("blocca senza conferma: %s", (text, action) => {
    const g = guardRequest({ user_request: text, requested_action: "" }, blackstar);
    expect(g.allowed).toBe(false);
    expect(g.decisions.map((d) => d.action)).toContain(action);
  });

  it("blocca l'azione esplicita in requested_action, anche se il testo è neutro", () => {
    const g = guardRequest({ user_request: "Procedi", requested_action: "publish" }, blackstar);
    expect(g.allowed).toBe(false);
  });

  it("consente l'azione solo con conferma esplicita su quell'azione", () => {
    const req = { user_request: "Pubblica l'articolo sul blog", requested_action: "" };
    expect(guardRequest(req, blackstar, ["delete"]).allowed).toBe(false);
    expect(guardRequest(req, blackstar, ["publish"]).allowed).toBe(true);
  });

  it("non blocca una richiesta di sola proposta", () => {
    const g = guardRequest({ user_request: "Proponi un articolo su Dataform per il mio blog", requested_action: "" }, blackstar);
    expect(g.allowed).toBe(true);
    expect(g.decisions).toEqual([]);
  });
});
