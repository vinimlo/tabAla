/**
 * Core types and utilities for the TabAla extension.
 *
 * This module defines the fundamental data structures used throughout the extension:
 * - {@link Link}: Represents a saved tab/URL with metadata
 * - {@link Collection}: Represents a group of links for organization
 *
 * ## Domain Model
 *
 * Links belong to Collections via the `collectionId` reference. The "Inbox" collection
 * is a special default collection that always exists and cannot be deleted. When a
 * collection is deleted, its links are moved to Inbox.
 *
 * ## Data Format Conventions
 *
 * - **IDs**: UUID v4 format (e.g., "550e8400-e29b-41d4-a716-446655440000")
 * - **Timestamps**: Unix epoch in milliseconds (e.g., 1704067200000 for Jan 1, 2024)
 * - **Colors**: Hexadecimal format with # prefix (#RGB or #RRGGBB)
 *
 * @module types
 */

/**
 * Represents a saved tab/URL in the extension.
 *
 * Links are the core data entity - each represents a webpage the user
 * has saved for later processing. Links always belong to a collection
 * and are ordered by creation date (most recent first).
 *
 * @example
 * ```typescript
 * const link: Link = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   url: 'https://developer.mozilla.org/en-US/docs/Web/API',
 *   title: 'Web APIs | MDN',
 *   collectionId: 'inbox',
 *   createdAt: 1704067200000,
 *   favicon: 'https://developer.mozilla.org/favicon.ico'
 * };
 * ```
 */
export interface Link {
  /**
   * Unique identifier for the link.
   * Generated using crypto.randomUUID() - UUID v4 format.
   */
  id: string;

  /**
   * Complete URL of the saved page.
   * Must be a valid URL (http://, https://, or other valid protocols).
   */
  url: string;

  /**
   * Title of the saved page.
   * Typically captured from document.title at save time.
   */
  title: string;

  /**
   * ID of the collection this link belongs to.
   * References {@link Collection.id}. Every link must belong to a collection.
   */
  collectionId: string;

  /**
   * Unix timestamp (milliseconds) when the link was created.
   * Use Date.now() to generate this value.
   */
  createdAt: number;

  /**
   * URL of the page's favicon/icon.
   * Optional - may not be available for all pages.
   */
  favicon?: string;
}

/**
 * Represents a collection (group) of links.
 *
 * Collections allow users to organize their saved links into logical groups.
 * The "Inbox" collection is special - it's the default destination for new
 * links and cannot be deleted.
 *
 * @example
 * ```typescript
 * const collection: Collection = {
 *   id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
 *   name: 'Reading List',
 *   createdAt: 1704067200000,
 *   color: '#FF5733'
 * };
 * ```
 */
export interface Collection {
  /**
   * Unique identifier for the collection.
   * Generated using crypto.randomUUID() - UUID v4 format.
   */
  id: string;

  /**
   * Display name of the collection.
   * Shown in the UI for user identification.
   */
  name: string;

  /**
   * Display order for the collection (lower = first).
   * Used for sorting collections in the UI.
   */
  order: number;

  /**
   * Unix timestamp (milliseconds) when the collection was created.
   * Use Date.now() to generate this value.
   */
  createdAt?: number;

  /**
   * Hexadecimal color code for visual identification in UI.
   * Optional - must be in #RGB or #RRGGBB format (e.g., "#F57" or "#FF5733").
   */
  color?: string;
}

/**
 * Generates a unique identifier using the native crypto API.
 *
 * Uses crypto.randomUUID() which generates RFC 4122 compliant UUIDs.
 * This is available in all modern browsers and service workers.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 *
 * @example
 * ```typescript
 * const id = generateId();
 * console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Validates if a string is a valid hexadecimal color code.
 *
 * Accepts both short (#RGB) and long (#RRGGBB) formats.
 * The # prefix is required.
 *
 * @param color - The color string to validate
 * @returns true if the color is a valid hex color, false otherwise
 *
 * @example
 * ```typescript
 * isValidHexColor('#FF5733');  // true
 * isValidHexColor('#F57');     // true
 * isValidHexColor('FF5733');   // false (missing #)
 * isValidHexColor('#GG5733');  // false (invalid hex chars)
 * isValidHexColor('#FF57');    // false (invalid length)
 * ```
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexColorRegex.test(color);
}

/**
 * Validates if a string is a valid URL.
 *
 * Uses the native URL constructor for validation, which checks
 * for proper URL structure and protocol.
 *
 * @param url - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidUrl('https://example.com');           // true
 * isValidUrl('http://localhost:3000/path');    // true
 * isValidUrl('chrome-extension://id/page');    // true
 * isValidUrl('not-a-url');                     // false
 * isValidUrl('');                              // false
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
