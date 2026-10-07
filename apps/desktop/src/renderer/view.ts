import type { ChatResponse, DapResult, GuardedAction } from "../shared/ipc";

/** Solo funzioni pure su DOM: ogni testo entra tramite `textContent`, mai `innerHTML`. */

export const STATUS_LABELS: Record<DapResult["status"], string> = {
  completed: "Completato",
  needs_input: "Servono informazioni",
  blocked: "Bloccato",
  handed_off: "Passato ad altro agente",
  failed: "Non riuscito",
};

export const ACTION_LABELS: Record<GuardedAction, string> = {
  publish: "pubblicazione",
  external_write: "scrittura esterna",
  delete: "eliminazione",
  editorial_plan_change: "modifica del piano editoriale",
};

function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  opts: { className?: string; text?: string; attrs?: Record<string, string> } = {},
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (opts.className) node.className = opts.className;
  if (opts.text !== undefined) node.textContent = opts.text;
  for (const [k, v] of Object.entries(opts.attrs ?? {})) node.setAttribute(k, v);
  return node;
}

function list(doc: Document, items: string[], ordered = false): HTMLElement {
  const ul = el(doc, ordered ? "ol" : "ul");
  for (const i of items) ul.appendChild(el(doc, "li", { text: i }));
  return ul;
}

function section(doc: Document, title: string, body: HTMLElement): HTMLElement {
  const s = el(doc, "section", { className: "block" });
  s.appendChild(el(doc, "h3", { text: title }));
  s.appendChild(body);
  return s;
}

interface Proposal {
  working_title?: string;
  topic?: string;
  channel?: string;
  outline: string[];
  note?: string;
}

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Estrae la proposta editoriale dagli artifact, senza fidarsi della loro forma. */
export function findProposal(result: DapResult): Proposal | null {
  for (const a of result.artifacts) {
    if (typeof a !== "object" || a === null || a["kind"] !== "editorial_proposal") continue;
    const outline = Array.isArray(a["outline"]) ? a["outline"].filter((x): x is string => typeof x === "string") : [];
    return {
      working_title: str(a["working_title"]),
      topic: str(a["topic"]),
      channel: str(a["channel"]),
      outline,
      note: str(a["note"]),
    };
  }
  return null;
}

export function renderUserMessage(doc: Document, text: string): HTMLElement {
  const m = el(doc, "article", { className: "msg user" });
  m.appendChild(el(doc, "p", { text }));
  return m;
}

export function renderError(doc: Document, message: string): HTMLElement {
  const m = el(doc, "article", { className: "msg bot error", attrs: { "data-status": "error" } });
  m.appendChild(el(doc, "p", { text: message }));
  return m;
}

export interface ResultHandlers {
  /** Chiamato quando l'utente conferma esplicitamente un'azione protetta. */
  onConfirm: (action: GuardedAction) => void;
}

/** Rende un DAP Result: stato, summary, proposta, outline, azioni richieste, blocker. */
export function renderResponse(doc: Document, response: ChatResponse, handlers: ResultHandlers): HTMLElement {
  if (!response.ok) return renderError(doc, response.error);
  const { result, pending_confirmations } = response;

  const card = el(doc, "article", { className: "msg bot", attrs: { "data-status": result.status } });
  card.appendChild(el(doc, "span", { className: "badge", text: STATUS_LABELS[result.status] }));
  card.appendChild(el(doc, "p", { className: "summary", text: result.summary }));

  const proposal = findProposal(result);
  if (proposal) {
    const body = el(doc, "div", { className: "proposal" });
    if (proposal.working_title) body.appendChild(el(doc, "p", { className: "title", text: proposal.working_title }));
    if (proposal.outline.length) body.appendChild(list(doc, proposal.outline, true));
    if (proposal.note) body.appendChild(el(doc, "p", { className: "hint", text: proposal.note }));
    card.appendChild(section(doc, "Proposta", body));
  }

  if (result.blockers.length) card.appendChild(section(doc, "Bloccato perché", list(doc, result.blockers)));
  if (result.actions_required.length) card.appendChild(section(doc, "Azioni richieste", list(doc, result.actions_required)));

  if (pending_confirmations.length) {
    const box = el(doc, "div", { className: "confirm" });
    box.appendChild(
      el(doc, "p", {
        className: "hint",
        text: "La conferma vale solo per questa richiesta. In questa versione non viene eseguita alcuna azione esterna.",
      }),
    );
    for (const action of pending_confirmations) {
      const b = el(doc, "button", {
        className: "confirm-btn",
        text: `Conferma ${ACTION_LABELS[action]}`,
        attrs: { type: "button", "data-action": action },
      });
      b.addEventListener("click", () => handlers.onConfirm(action));
      box.appendChild(b);
    }
    card.appendChild(box);
  }

  const notes = [...result.facts, ...result.assumptions.map((a) => `Assunzione: ${a}`)];
  if (notes.length) {
    const d = el(doc, "details", { className: "block" });
    d.appendChild(el(doc, "summary", { text: "Fatti e assunzioni" }));
    d.appendChild(list(doc, notes));
    card.appendChild(d);
  }
  return card;
}
