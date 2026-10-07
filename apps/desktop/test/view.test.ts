// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BlackstarApi, ChatResponse } from "../src/shared/ipc";
import { initApp } from "../src/renderer/app";
import { mascotStateForStatus } from "../src/renderer/mascot";
import { renderResponse } from "../src/renderer/view";

const base = { facts: [], assumptions: [], decisions: [], actions_completed: [], artifacts: [], memory_updates: [], handoff: null };
const noop = { onConfirm: () => {} };

const blocked: ChatResponse = {
  ok: true,
  pending_confirmations: ["publish"],
  result: {
    ...base,
    request_id: "req_1",
    status: "blocked",
    summary: "Richiesta bloccata: serve conferma esplicita per publish.",
    blockers: ['"publish" richiede conferma esplicita.'],
    actions_required: ['Conferma esplicitamente l\'azione "publish" per procedere.'],
  },
};

const completed: ChatResponse = {
  ok: true,
  pending_confirmations: [],
  result: {
    ...base,
    request_id: "req_2",
    status: "completed",
    summary: 'Proposta editoriale preliminare su "Dataform".',
    blockers: [],
    actions_required: ["Chiarisci pubblico di riferimento."],
    artifacts: [{ kind: "editorial_proposal", working_title: "Dataform: guida pratica", outline: ["Contesto", "Esempio"], note: "Template locale" }],
  },
};

describe("rendering del DAP Result", () => {
  it("mostra lo stato blocked con motivo, azioni richieste e pulsante di conferma", () => {
    const node = renderResponse(document, blocked, noop);
    expect(node.getAttribute("data-status")).toBe("blocked");
    expect(node.querySelector(".badge")?.textContent).toBe("Bloccato");
    expect(node.querySelector(".summary")?.textContent).toContain("serve conferma esplicita");
    expect(node.textContent).toContain("richiede conferma esplicita");
    expect(node.textContent).toContain("Azioni richieste");
    const btn = node.querySelector<HTMLButtonElement>("button.confirm-btn")!;
    expect(btn.dataset["action"]).toBe("publish");
    expect(btn.textContent).toBe("Conferma pubblicazione");
    expect(node.textContent).toContain("non viene eseguita alcuna azione esterna");
  });

  it("chiama onConfirm con l'azione scelta", () => {
    const onConfirm = vi.fn();
    renderResponse(document, blocked, { onConfirm }).querySelector<HTMLButtonElement>("button.confirm-btn")!.click();
    expect(onConfirm).toHaveBeenCalledWith("publish");
  });

  it("mostra summary, proposta, outline e azioni richieste per completed", () => {
    const node = renderResponse(document, completed, noop);
    expect(node.getAttribute("data-status")).toBe("completed");
    expect(node.querySelector(".proposal .title")?.textContent).toBe("Dataform: guida pratica");
    expect([...node.querySelectorAll(".proposal ol li")].map((l) => l.textContent)).toEqual(["Contesto", "Esempio"]);
    expect(node.textContent).toContain("Chiarisci pubblico di riferimento.");
    expect(node.querySelector("button")).toBeNull();
  });

  it("tratta il testo come testo, mai come HTML", () => {
    const evil: ChatResponse = { ...completed, result: { ...completed.result, summary: "<img src=x onerror=alert(1)>" } } as ChatResponse;
    const node = renderResponse(document, evil, noop);
    expect(node.querySelector("img")).toBeNull();
    expect(node.querySelector(".summary")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("mostra un errore generico se la risposta non è ok", () => {
    const node = renderResponse(document, { ok: false, error: "Richiesta non valida" }, noop);
    expect(node.getAttribute("data-status")).toBe("error");
  });

  it("mappa gli stati della mascotte", () => {
    expect(mascotStateForStatus("blocked")).toBe("blocked");
    expect(mascotStateForStatus("failed")).toBe("blocked");
    expect(mascotStateForStatus("completed")).toBe("responding");
  });
});

describe("app: mascotte e conversazione", () => {
  let chat: ReturnType<typeof vi.fn>;
  const flush = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    document.body.innerHTML = readFileSync(join(__dirname, "../src/renderer/index.html"), "utf8").match(/<body>([\s\S]*)<\/body>/)![1]!.replace(/<script[\s\S]*?<\/script>/, "");
    chat = vi.fn();
    initApp(document, { chat } as unknown as BlackstarApi);
  });

  const mascot = () => document.getElementById("mascot")!.getAttribute("data-state");
  const panel = () => document.getElementById("panel") as HTMLElement;

  it("il click sulla mascotte apre e chiude il pannello", () => {
    const btn = document.getElementById("mascot-btn")!;
    expect(panel().hidden).toBe(true);
    btn.click();
    expect(panel().hidden).toBe(false);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    btn.click();
    expect(panel().hidden).toBe(true);
  });

  it("passa da idle a listening a working a blocked, poi conferma e risponde", async () => {
    chat.mockResolvedValueOnce(blocked).mockResolvedValueOnce({ ...completed });
    expect(mascot()).toBe("idle");
    (document.getElementById("mascot-btn") as HTMLElement).click();
    const input = document.getElementById("input") as HTMLTextAreaElement;
    input.dispatchEvent(new Event("focus"));
    expect(mascot()).toBe("listening");

    input.value = "Pubblica l'articolo su Dataform sul blog";
    (document.getElementById("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    expect(mascot()).toBe("working");
    await flush();
    expect(mascot()).toBe("blocked");
    expect(chat).toHaveBeenLastCalledWith("Pubblica l'articolo su Dataform sul blog", { confirmations: [] });

    document.querySelector<HTMLButtonElement>("button.confirm-btn")!.click();
    await flush();
    expect(chat).toHaveBeenLastCalledWith("Pubblica l'articolo su Dataform sul blog", { confirmations: ["publish"] });
    expect(mascot()).toBe("responding");
    expect(document.querySelectorAll(".msg.user").length).toBe(1);
  });

  it("il pulsante demo precompila la richiesta di esempio", () => {
    (document.getElementById("demo") as HTMLElement).click();
    expect((document.getElementById("input") as HTMLTextAreaElement).value).toBe("Proponi un articolo su Dataform per il mio blog");
  });

  it("segnala blocked se il bridge IPC fallisce", async () => {
    chat.mockRejectedValueOnce(new Error("boom"));
    (document.getElementById("input") as HTMLTextAreaElement).value = "ciao";
    (document.getElementById("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await flush();
    expect(mascot()).toBe("blocked");
    expect(document.querySelector(".msg.error")).not.toBeNull();
  });
});
