import { z } from "zod";
import { BASELINE_GUARDED_ACTIONS, DapResultSchema, type DapResult } from "@daniel-ai-os/contracts";

export { CHAT_CHANNEL } from "./channel";

const GuardedActionSchema = z.enum(BASELINE_GUARDED_ACTIONS);
export type GuardedAction = z.infer<typeof GuardedActionSchema>;

export const MAX_MESSAGE_LENGTH = 2000;

export const ChatOptionsSchema = z
  .object({
    /** Conferme esplicite valide solo per questa richiesta. */
    confirmations: z.array(GuardedActionSchema).max(BASELINE_GUARDED_ACTIONS.length).default([]),
    projectId: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .max(64)
      .nullable()
      .optional(),
  })
  .strict();

export const ChatRequestSchema = z
  .object({
    message: z.string().trim().min(1, "Messaggio vuoto").max(MAX_MESSAGE_LENGTH, "Messaggio troppo lungo"),
    options: ChatOptionsSchema.default({}),
  })
  .strict();

export const ChatResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      result: DapResultSchema,
      /** Azioni che hanno bloccato la richiesta e che l'utente può confermare. */
      pending_confirmations: z.array(GuardedActionSchema),
    })
    .strict(),
  z.object({ ok: z.literal(false), error: z.string() }).strict(),
]);

export type ChatOptions = z.input<typeof ChatOptionsSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type { DapResult };

/** Unica API esposta alla UI come `window.blackstar`. */
export interface BlackstarApi {
  chat(message: string, options?: ChatOptions): Promise<ChatResponse>;
}
