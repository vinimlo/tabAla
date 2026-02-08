/**
 * Core types and utilities for the TabAla extension.
 *
 * Links belong to Collections via `collectionId`. The "Inbox" collection
 * always exists and cannot be deleted. When a collection is deleted, its
 * links are moved to Inbox.
 *
 * IDs: UUID v4 | Timestamps: Unix ms | Colors: #RGB or #RRGGBB
 */

/** A saved tab/URL. Always belongs to a collection, ordered by createdAt desc. */
export interface Link {
  id: string;
  url: string;
  title: string;
  /** References Collection.id. */
  collectionId: string;
  /** Unix timestamp (ms). */
  createdAt: number;
  favicon?: string;
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
}

export const DEFAULT_SETTINGS: Settings = {
  newtabEnabled: true,
  onboardingCompleted: false,
  theme: 'system',
};

// Workspace types

export const DEFAULT_WORKSPACE_ID = 'general';
export const DEFAULT_WORKSPACE_NAME = 'Geral';
export const WORKSPACE_LIMIT = 12;

/** Colors designed to work well with the dark theme. */
export const WORKSPACE_COLORS = [
  '#E85D42', // Coral (accent principal - reservado para workspace Geral/default)
  '#D4726A', // Dusty Rose
  '#D4A85A', // Warm Amber
  '#7CB890', // Sage Green
  '#6B8AAF', // Slate Blue
  '#9B8AA0', // Dusty Purple
  '#5DA3A0', // Teal Muted
  '#C4956A', // Warm Sand
  '#8B7E6A', // Taupe
  '#A08B7B', // Warm Gray
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
