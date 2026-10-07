import type { BlackstarApi, GuardedAction } from "../shared/ipc";
import { mascotStateForStatus, setMascotState, type MascotState } from "./mascot";
import { renderError, renderResponse, renderUserMessage } from "./view";

export const DEMO_REQUEST = "Proponi un articolo su Dataform per il mio blog";
const RESPONDING_MS = 1800;

/** Collega DOM e API esposta dal preload. Nessun accesso a Node, fs o Electron. */
export function initApp(doc: Document, api: BlackstarApi): void {
  const $ = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const mascotBtn = $<HTMLButtonElement>("mascot-btn");
  const mascot = doc.getElementById("mascot")!;
  const panel = $<HTMLElement>("panel");
  const log = $<HTMLElement>("log");
  const form = $<HTMLFormElement>("form");
  const input = $<HTMLTextAreaElement>("input");
  const send = $<HTMLButtonElement>("send");
  const demo = $<HTMLButtonElement>("demo");

  let busy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const setState = (s: MascotState) => setMascotState(mascot, s);

  const idleState = (): MascotState => (doc.activeElement === input && !panel.hidden ? "listening" : "idle");

  function togglePanel(): void {
    const open = panel.hidden;
    panel.hidden = !open;
    mascotBtn.setAttribute("aria-expanded", String(open));
    mascotBtn.setAttribute("aria-label", open ? "BLACKSTAR: chiudi la conversazione" : "BLACKSTAR: apri la conversazione");
    if (open) input.focus();
  }

  function append(node: HTMLElement): void {
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
  }

  async function submit(message: string, confirmations: GuardedAction[] = [], echo = true): Promise<void> {
    if (busy || !message.trim()) return;
    busy = true;
    clearTimeout(timer);
    send.disabled = demo.disabled = true;
    if (echo) append(renderUserMessage(doc, message));
    setState("working");
    try {
      const response = await api.chat(message, { confirmations });
      append(
        renderResponse(doc, response, {
          onConfirm: (action) => void submit(message, [...confirmations, action], false),
        }),
      );
      const status = response.ok ? response.result.status : "failed";
      const next = mascotStateForStatus(status);
      setState(next);
      if (next === "responding") timer = setTimeout(() => setState(idleState()), RESPONDING_MS);
    } catch {
      append(renderError(doc, "Impossibile contattare il runtime locale."));
      setState("blocked");
    } finally {
      busy = false;
      send.disabled = demo.disabled = false;
    }
  }

  mascotBtn.addEventListener("click", togglePanel);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = "";
    void submit(text);
  });
  demo.addEventListener("click", () => {
    input.value = DEMO_REQUEST;
    input.focus();
  });
  input.addEventListener("focus", () => {
    if (!busy) setState("listening");
  });
  input.addEventListener("blur", () => {
    if (!busy && mascot.getAttribute("data-state") === "listening") setState("idle");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}
