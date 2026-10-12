import type { Category } from "../../src/data/categories";
import type { DiscoveredTool, Evidence } from "../../src/data/types";

/** How much a kind of source is trusted. Official announcements count most. */
export type Tier = "vendor" | "press" | "community";

export interface Source {
  id: string;
  name: string;
  url: string;
  tier: Tier;
  /** For a vendor's own feed: who it is, so "Introducing X" there is credited to them. */
  maker?: string;
  /** "product": titles read "Name – tagline" (launch sites). "headline": news headlines. */
  titles?: "product" | "headline";
  /** Everything this source posts is about AI, so posts aren't checked for it. */
  aiOnly?: boolean;
}

export interface FeedItem {
  title: string;
  link: string;
  /** yyyy-mm-dd, or "" if the feed gave none. */
  date: string;
  /** Plain text. */
  summary: string;
  /** Addresses linked from the post, for finding a product's own site. */
  links: string[];
}

/** A product or model named in one post. */
export interface Mention {
  name: string;
  /** The name without version numbers, lowercase: "Veo 3.1" and "Veo 4" are one family, "veo". */
  key: string;
  kind: "tool" | "model";
  source: Source;
  item: FeedItem;
}

/** Edits made by hand. The one place a person can steer the run without touching code. */
export interface Overrides {
  /** Names never to list (any case). */
  blockNames: string[];
  /** Tool ids never to list. */
  blockIds: string[];
  /** Names that mean a tool already in the catalog: { "gpt image": "chatgpt" }. */
  alias: Record<string, string>;
  /** Category ids never to create. */
  blockCategories: string[];
}

/** A product mentioned but not yet seen often enough to list. Evidence builds up across days. */
export interface PendingTool {
  key: string;
  name: string;
  kind: "tool" | "model";
  maker?: string;
  firstSeen: string;
  lastSeen: string;
  /** Mentions so far, each from one source on one day. */
  mentions: (Evidence & { sourceId: string; tier: Tier })[];
  /** Posts' own words about it, for filing it. */
  summary: string;
  /** Addresses the posts linked, for finding its site. */
  links: string[];
}

export interface SourceHealth {
  id: string;
  url: string;
  ok: boolean;
  lastOk: string | null;
  /** Failed runs in a row. After a week the source is tried only weekly. */
  failures: number;
  items: number;
  error?: string;
}

export interface DiscoveredFile {
  updatedAt: string;
  sources: SourceHealth[];
  tools: DiscoveredTool[];
  pending: PendingTool[];
  /** Ids removed for going quiet, kept for a while so a stray mention doesn't bring one straight back. */
  retired: { id: string; on: string }[];
}

export interface TaxonomyFile {
  updatedAt: string;
  categories: Category[];
  /** Why each automatic category exists: the tools that earned it, for anyone who wonders. */
  history: { id: string; createdAt: string; reason: string; examples: string[] }[];
  /** When an automatic category last had fewer than two tools, so it can be retired if that lasts. */
  lowSince: Record<string, string>;
}

export const EMPTY_DISCOVERED: DiscoveredFile = { updatedAt: "", sources: [], tools: [], pending: [], retired: [] };
export const EMPTY_TAXONOMY: TaxonomyFile = { updatedAt: "", categories: [], history: [], lowSince: {} };
