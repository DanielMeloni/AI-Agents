import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { createBlackstarExecutor } from "@daniel-ai-os/blackstar";
import { findRepoRoot, loadAgentManifests } from "@daniel-ai-os/runtime";
import { ChatResponseSchema } from "../src/shared/ipc";
import { createChatHandler } from "../src/main/chat-handler";

const repoRoot = findRepoRoot(__dirname);
const manifests = loadAgentManifests(repoRoot);
const appUrl = pathToFileURL(join(repoRoot, "apps/desktop/dist/renderer/index.html")).href;
const errors: unknown[] = [];
const handle = createChatHandler({
  repoRoot,
  manifests,
  executors: manifests.filter((m) => m.id === "blackstar").map(createBlackstarExecutor),
  appUrl,
  log: (e) => errors.push(e),
});

describe("IPC chat handler", () => {
  it("esegue la richiesta demo e restituisce un DAP Result valido", () => {
    const res = handle(appUrl, { message: "Proponi un articolo su Dataform per il mio blog" });
    expect(ChatResponseSchema.safeParse(res).success).toBe(true);
    expect(res).toMatchObject({ ok: true, pending_confirmations: [], result: { status: "completed" } });
  });

  it("blocca la pubblicazione senza conferma ed espone l'azione da confermare", () => {
    const res = handle(appUrl, { message: "Pubblica l'articolo su Dataform sul blog" });
    expect(res).toMatchObject({ ok: true, result: { status: "blocked" }, pending_confirmations: ["publish"] });
  });

  it("con conferma esplicita sblocca il guard ma non esegue azioni esterne", () => {
    const res = handle(appUrl, {
      message: "Pubblica l'articolo su Dataform sul blog",
      options: { confirmations: ["publish"] },
    });
    expect(res.ok && res.result.status).not.toBe("blocked");
    expect(res.ok && res.result.facts.join(" ")).toContain("nessuna azione eseguita");
    expect(res.ok && res.pending_confirmations).toEqual([]);
  });

  it.each([
    ["null", null],
    ["messaggio vuoto", { message: "   " }],
    ["messaggio non stringa", { message: 42 }],
    ["messaggio troppo lungo", { message: "x".repeat(2001) }],
    ["campo sconosciuto", { message: "ciao", extra: true }],
    ["azione non ammessa", { message: "ciao", options: { confirmations: ["rm_rf"] } }],
    ["opzione sconosciuta", { message: "ciao", options: { path: "/etc/passwd" } }],
  ])("rifiuta un payload non valido: %s", (_n, raw) => {
    expect(handle(appUrl, raw)).toMatchObject({ ok: false });
  });

  it("rifiuta mittenti diversi dalla pagina locale", () => {
    for (const url of [undefined, "https://example.com/", "file:///tmp/altro.html"]) {
      expect(handle(url, { message: "Proponi un articolo su Dataform per il mio blog" })).toEqual({
        ok: false,
        error: "Mittente non autorizzato.",
      });
    }
  });

  it("non perde dettagli interni verso la UI quando il runtime fallisce", () => {
    const broken = createChatHandler({ repoRoot: "/nonexistent", manifests, executors: [createBlackstarExecutor(manifests.find((m) => m.id === "blackstar")!)], appUrl, log: (e) => errors.push(e) });
    const res = broken(appUrl, { message: "Proponi un articolo su Dataform per il mio blog" });
    expect(res).toEqual({ ok: false, error: "Errore interno durante l'elaborazione della richiesta." });
    expect(errors.length).toBe(1);
  });
});
