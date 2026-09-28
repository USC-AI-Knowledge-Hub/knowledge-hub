import { createContext, useContext } from "react";
import type { SiteHit, ToolHit } from "../../lib/siteSearch";
import type { NextStep, Goal, Role } from "../../lib/tutor/guide";
import type { Source } from "../../lib/tutor/retrieval";
import type { TutorEngine } from "../../lib/tutor/useEngine";

export type Item =
  | { id: number; kind: "user"; text: string }
  | {
      id: number;
      kind: "answer";
      text: string;
      state: "thinking" | "streaming" | "done" | "stopped" | "error";
      label?: string;
      related?: SiteHit[];
      sources?: Source[];
      /** Lessons whose videos to suggest under the answer, most relevant first. */
      watch?: string[];
    }
  | { id: number; kind: "nav"; dest: string; hits: SiteHit[]; opened: SiteHit | null }
  | { id: number; kind: "next"; rec: NextStep | null }
  | { id: number; kind: "path"; role?: Role; goal?: Goal }
  | { id: number; kind: "toolAsk" }
  | { id: number; kind: "tools"; task: string; hits: ToolHit[] }
  | {
      id: number;
      kind: "reading";
      title: string;
      intro: string;
      paragraphs: string[];
      bullets?: string[];
      route?: string;
      related?: SiteHit[];
      /** Lessons whose videos to suggest. */
      watch?: string[];
      /** Hidden-until-revealed bullets, for "quiz me" without a model. */
      recall?: boolean;
    };

/** Distributes Omit over the union so each item keeps its own fields. */
export type NewItem = Item extends infer T ? (T extends Item ? Omit<T, "id"> : never) : never;

export type Action =
  | { type: "next" }
  | { type: "path" }
  | { type: "toolAsk" }
  | { type: "toolTask"; task: string }
  | { type: "quiz"; module: string }
  | { type: "simpler"; module: string }
  | { type: "toolWhen"; tool: string };

export type View = { name: "home" } | { name: "chat" } | { name: "quest"; quest: string } | { name: "setup" };

export interface TutorApi {
  engine: TutorEngine;
  items: Item[];
  view: View;
  setView(v: View): void;
  send(text: string): void;
  act(a: Action, label: string): void;
  update(id: number, patch: Partial<Item>): void;
  /** Navigate within the site; on small screens this also closes the sheet so the page is visible. */
  go(route: string): void;
  announce(text: string): void;
  close(): void;
}

export const TutorContext = createContext<TutorApi | null>(null);

export function useTutor(): TutorApi {
  const t = useContext(TutorContext);
  if (!t) throw new Error("useTutor needs <Tutor>");
  return t;
}
