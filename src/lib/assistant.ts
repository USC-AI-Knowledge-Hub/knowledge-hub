import type { ChatMessage } from "./tutor/prompt";

/**
 * The offline assistant's conversation, kept in this browser only so it's still there when someone
 * comes back offline. It stays on the device like everything else the assistant does.
 */
const KEY = "kh-assistant-chat";
/** Enough for a long session; the model only ever sees the recent part (CHAT_LIMITS in prompt.ts). */
export const MAX_SAVED_MESSAGES = 60;
export const MAX_SAVED_CHARS = 120_000;

export type Message = Exclude<ChatMessage, { role: "system" }> & { role: "user" | "assistant" };

export function trimSaved(messages: Message[]): Message[] {
  let out = messages.slice(-MAX_SAVED_MESSAGES);
  const size = () => out.reduce((n, m) => n + m.content.length, 0);
  while (out.length > 1 && size() > MAX_SAVED_CHARS) out = out.slice(1);
  // Start on a question, so the saved chat reads from the top.
  while (out.length && out[0].role !== "user") out = out.slice(1);
  return out;
}

export function loadChat(): Message[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return trimSaved(
      raw.filter(
        (m): m is Message => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "",
      ),
    );
  } catch {
    return [];
  }
}

export function saveChat(messages: Message[]) {
  try {
    if (messages.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(trimSaved(messages)));
  } catch {
    /* Private mode or full storage: the chat lasts for this visit only. */
  }
}
