/**
 * Core types and utilities for the TabAla extension.
 *
 * Links belong to Collections via `collectionId`. The "Inbox" collection
 * always exists and cannot be deleted. When a collection is deleted, its
 * links are moved to Inbox.
 *
 * IDs: UUID v4 | Timestamps: Unix ms | Colors: #RGB or #RRGGBB
 */

/**
 * A saved tab/URL. Always belongs to a collection. Display order: see
 * sortCollectionLinks (manual position, new links on top).
 */
export interface Link {
  id: string;
  url: string;
  title: string;
  /** References Collection.id. */
  collectionId: string;
  /** Unix timestamp (ms). */
  createdAt: number;
  favicon?: string;
  /** Manual position within the collection, set by drag and drop. */
  order?: number;
  /** Subject tags. Absent: not tagged yet. []: tagged, without tags. */
  tags?: string[];
  /** Unix ms. Present: completed — off the board and the queue, listed in Focus › Completed. */
  completedAt?: number;
  /** Start of a local day (Unix ms). Until then the link stays out of the queue. */
  snoozedUntil?: number;
  /** Unix ms of the last "still worth it" answer in triage. */
  keptAt?: number;
  /** true: reference, never in the queue. false: pending even in a reference collection. Absent: follows the collection. */
  reference?: boolean;
}

/**
 * A group of links. The "Inbox" collection is the default destination
 * for new links and cannot be deleted.
 */
export interface Collection {
  id: string;
  name: string;
  /** Lower = first in UI. */
  order: number;
  createdAt?: number;
  /** #RGB or #RRGGBB format. */
  color?: string;
  /** True only for the Inbox collection. */
  isDefault?: boolean;
  /** undefined for Inbox (global), 'general' for default workspace, or UUID. */
  workspaceId?: string;
  /** Every link counts as reference, unless the link says `reference: false`. */
  reference?: boolean;
  /** Front pinned as focus by the user. */
  focus?: boolean;
}

export const INBOX_COLLECTION_ID = 'inbox';
export const INBOX_COLLECTION_NAME = 'Inbox';

/** Inbox collection with narrowed types for id and isDefault. */
export interface InboxCollection extends Collection {
  id: typeof INBOX_COLLECTION_ID;
  isDefault: true;
}

/** Accepts #RGB and #RRGGBB formats. */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/** Only http:, https:, and file: protocols are allowed. */
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:', 'file:'];

/** Validates URL structure and restricts to safe protocols. */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_URL_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  /** Use TabAla dashboard as the new tab page. */
  newtabEnabled: boolean;
  /** Show onboarding modal on first access. */
  onboardingCompleted: boolean;
  /** User's preferred color theme. Defaults to system preference. */
  theme: ThemePreference;
  /** Also search the English translation of each query (Chrome's on-device translator). */
  topicSearch: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  newtabEnabled: true,
  onboardingCompleted: false,
  theme: 'system',
  topicSearch: false,
};

// Workspace types

export const DEFAULT_WORKSPACE_ID = 'general';
export const DEFAULT_WORKSPACE_NAME = 'Geral';
export const WORKSPACE_LIMIT = 12;

/** Colors designed to work well with both dark and light themes. */
export const WORKSPACE_COLORS = [
  // Warm
  '#E85D42', // Coral (accent principal - reservado para workspace Geral/default)
  '#D4726A', // Dusty Rose
  '#D4A85A', // Warm Amber
  '#E0976B', // Terracotta
  // Cool
  '#7CB890', // Sage Green
  '#5DA3A0', // Teal
  '#6B8AAF', // Slate Blue
  '#5B7FC7', // Royal Blue
  '#9B8AA0', // Dusty Purple
  '#B07BAF', // Orchid
  // Vibrant
  '#C75B8F', // Berry
  '#4EA8B5', // Cyan
  // Neutral
  '#8A9A82', // Olive
  '#9B8E82', // Warm Stone
] as const;

/**
 * Groups collections into logical contexts (e.g., "Work", "Personal").
 * The "Geral" workspace is the default and cannot be deleted.
 */
export interface Workspace {
  /** 'general' for default workspace, UUID v4 for user-created. */
  id: string;
  name: string;
  description?: string;
  /** #RRGGBB format. */
  color: string;
  /** Lower = first in rail. */
  order: number;
  createdAt: number;
  /** True only for the default workspace. */
  isDefault?: boolean;
}

/** Returns max(order) + 1, or 1 if empty. */
export function calculateNextOrder(items: { order: number }[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map((item) => item.order)) + 1;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  color: string;
}

// Recommendation data (never exported)

/**
 * What the user did with a link. Kept apart from `links` so recording an
 * open never redraws the board.
 */
export interface LinkActivity {
  opens: number;
  lastOpenedAt?: number;
  /** Distinct local days (AAAA-MM-DD) the link was opened, the last 10. */
  openDays: string[];
  /** Distinct local days the strip showed the link with no action since; any action clears it. */
  shownDays: string[];
  /** When leaving the strip after 3 days was counted; cleared with shownDays. */
  skippedAt?: number;
  /** Times snoozed; cleared on complete and on "still worth it". */
  snoozes: number;
  /** Phase 2: accumulated active time, in ms. */
  activeMs: number;
  /** Phase 2: set when a visit ended long enough to ask "completed?". */
  askCompleteAt?: number;
}

/** Keyed by link id. */
export type Activity = Record<string, LinkActivity>;

export const EMPTY_ACTIVITY: LinkActivity = { opens: 0, openDays: [], shownDays: [], snoozes: 0, activeMs: 0 };

/** Numbers of one ISO week. */
export interface WeekStats {
  /** Link × day shown in the strip. */
  shown: number;
  /** Opens or completions of a link the strip had shown (each showing counts once). */
  acted: number;
  snoozed: number;
  discarded: number;
  /** Links that left the strip after 3 days without action. */
  skipped: number;
  /** Last queue size seen in the week. */
  queue: number;
}

/** Keyed by ISO week (AAAA-Www); the last 12 weeks. */
export type RecoStats = Record<string, WeekStats>;

export const EMPTY_WEEK: WeekStats = { shown: 0, acted: 0, snoozed: 0, discarded: 0, skipped: 0, queue: 0 };
