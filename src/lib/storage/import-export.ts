/**
 * Import/Export functionality for TabAla data backup and restoration.
 *
 * Provides validation, preview, and execution of data imports with
 * referential integrity guarantees. Settings are excluded (device-local).
 */

import type { Link, Collection, Workspace } from '../types';
import {
  isValidUrl,
  isValidHexColor,
  INBOX_COLLECTION_ID,
  DEFAULT_WORKSPACE_ID,
  WORKSPACE_COLORS,
} from '../types';
import {
  getLinks,
  saveLinks,
  getCollections,
  saveCollections,
  getWorkspaces,
  saveWorkspaces,
} from './data-access';
import { initializeInbox } from './collections';
import { initializeDefaultWorkspace } from './workspaces';

export interface TabAlaExportFile {
  version: string;
  exportedAt: number;
  source: 'tabala';
  workspaces: Workspace[];
  collections: Collection[];
  links: Link[];
}

export interface ImportPreview {
  workspaces: number;
  collections: number;
  links: number;
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: { workspaces: number; collections: number; links: number };
  error?: string;
}

/**
 * Validates the structure and content of an export file.
 * Throws descriptive error if validation fails.
 */
export function validateExportFile(data: unknown): TabAlaExportFile {
  // Check root structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: must be a JSON object');
  }

  const obj = data as Record<string, unknown>;

  // Validate magic string and version
  if (obj.source !== 'tabala') {
    throw new Error('Invalid file: not a TabAla backup (missing "source": "tabala")');
  }

  if (typeof obj.version !== 'string') {
    throw new Error('Invalid file: missing or invalid version field');
  }

  // Validate arrays exist
  if (!Array.isArray(obj.workspaces)) {
    throw new Error('Invalid file: workspaces must be an array');
  }

  if (!Array.isArray(obj.collections)) {
    throw new Error('Invalid file: collections must be an array');
  }

  if (!Array.isArray(obj.links)) {
    throw new Error('Invalid file: links must be an array');
  }

  // Validate workspaces
  for (let i = 0; i < obj.workspaces.length; i++) {
    const w = obj.workspaces[i] as Record<string, unknown>;
    if (typeof w.id !== 'string' || !w.id) {
      throw new Error(`Invalid workspace at index ${i}: missing or invalid id`);
    }
    if (typeof w.name !== 'string' || !w.name) {
      throw new Error(`Invalid workspace at index ${i}: missing or invalid name`);
    }
    if (typeof w.color !== 'string' || !isValidHexColor(w.color)) {
      throw new Error(`Invalid workspace at index ${i}: invalid color format`);
    }
    if (typeof w.order !== 'number') {
      throw new Error(`Invalid workspace at index ${i}: missing or invalid order`);
    }
  }

  // Validate collections
  for (let i = 0; i < obj.collections.length; i++) {
    const c = obj.collections[i] as Record<string, unknown>;
    if (typeof c.id !== 'string' || !c.id) {
      throw new Error(`Invalid collection at index ${i}: missing or invalid id`);
    }
    if (typeof c.name !== 'string' || !c.name) {
      throw new Error(`Invalid collection at index ${i}: missing or invalid name`);
    }
    if (typeof c.order !== 'number') {
      throw new Error(`Invalid collection at index ${i}: missing or invalid order`);
    }
    if (c.color !== undefined && (typeof c.color !== 'string' || !isValidHexColor(c.color))) {
      throw new Error(`Invalid collection at index ${i}: invalid color format`);
    }
  }

  // Validate links
  for (let i = 0; i < obj.links.length; i++) {
    const l = obj.links[i] as Record<string, unknown>;
    if (typeof l.id !== 'string' || !l.id) {
      throw new Error(`Invalid link at index ${i}: missing or invalid id`);
    }
    if (typeof l.url !== 'string' || !l.url) {
      throw new Error(`Invalid link at index ${i}: missing or invalid url`);
    }
    if (typeof l.title !== 'string') {
      throw new Error(`Invalid link at index ${i}: missing or invalid title`);
    }
    if (typeof l.collectionId !== 'string' || !l.collectionId) {
      throw new Error(`Invalid link at index ${i}: missing or invalid collectionId`);
    }
    if (typeof l.createdAt !== 'number') {
      throw new Error(`Invalid link at index ${i}: missing or invalid createdAt`);
    }
  }

  return obj as TabAlaExportFile;
}

/**
 * Calculates what would be imported without modifying storage.
 * Returns counts and warnings about data issues.
 */
export async function previewImport(file: TabAlaExportFile): Promise<ImportPreview> {
  const [existingWorkspaces, existingCollections, existingLinks] = await Promise.all([
    getWorkspaces(),
    getCollections(),
    getLinks(),
  ]);

  const existingWorkspaceIds = new Set(existingWorkspaces.map((w) => w.id));
  const existingCollectionIds = new Set(existingCollections.map((c) => c.id));
  const existingLinkIds = new Set(existingLinks.map((l) => l.id));

  // Count new items (IDs that don't exist)
  const newWorkspaces = file.workspaces.filter((w) => !existingWorkspaceIds.has(w.id));
  const newCollections = file.collections.filter((c) => !existingCollectionIds.has(c.id));
  const newLinks = file.links.filter((l) => !existingLinkIds.has(l.id));

  const warnings: string[] = [];

  // Count invalid URLs
  const invalidUrls = newLinks.filter((l) => !isValidUrl(l.url)).length;
  if (invalidUrls > 0) {
    warnings.push(`${invalidUrls} links with invalid URLs will be skipped`);
  }

  // Count orphan collections (workspace doesn't exist and won't be imported)
  const allWorkspaceIds = new Set([
    ...existingWorkspaceIds,
    ...newWorkspaces.map((w) => w.id),
  ]);
  const orphanCollections = newCollections.filter(
    (c) => c.workspaceId && !allWorkspaceIds.has(c.workspaceId)
  ).length;
  if (orphanCollections > 0) {
    warnings.push(`${orphanCollections} collections will be moved to General workspace`);
  }

  // Count orphan links (collection doesn't exist and won't be imported)
  const allCollectionIds = new Set([
    ...existingCollectionIds,
    ...newCollections.map((c) => c.id),
  ]);
  const orphanLinks = newLinks.filter(
    (l) => !allCollectionIds.has(l.collectionId)
  ).length;
  if (orphanLinks > 0) {
    warnings.push(`${orphanLinks} links will be moved to Inbox`);
  }

  return {
    workspaces: newWorkspaces.length,
    collections: newCollections.length,
    links: newLinks.length - invalidUrls, // Don't count invalid URLs
    warnings,
  };
}

/**
 * Executes the import, merging data with referential integrity.
 * Order matters: workspaces → collections → links.
 */
export async function executeImport(file: TabAlaExportFile): Promise<ImportResult> {
  try {
    // 1. Read current state
    const [existingWorkspaces, existingCollections, existingLinks] = await Promise.all([
      getWorkspaces(),
      getCollections(),
      getLinks(),
    ]);

    const existingWorkspaceIds = new Set(existingWorkspaces.map((w) => w.id));
    const existingCollectionIds = new Set(existingCollections.map((c) => c.id));
    const existingLinkIds = new Set(existingLinks.map((l) => l.id));

    // 2. Process workspaces (first, since collections depend on them)
    const newWorkspaces: Workspace[] = [];
    for (const workspace of file.workspaces) {
      if (existingWorkspaceIds.has(workspace.id)) {
        continue; // Skip duplicates
      }

      // Validate color, fallback to first available
      let color = workspace.color;
      if (!isValidHexColor(color)) {
        color = WORKSPACE_COLORS[0];
      }

      newWorkspaces.push({ ...workspace, color });
    }

    const mergedWorkspaces = [...existingWorkspaces, ...newWorkspaces];
    await saveWorkspaces(mergedWorkspaces);
    await initializeDefaultWorkspace(); // Ensure default exists

    // 3. Process collections (second, since links depend on them)
    const validWorkspaceIds = new Set(mergedWorkspaces.map((w) => w.id));
    const newCollections: Collection[] = [];

    for (const collection of file.collections) {
      if (existingCollectionIds.has(collection.id)) {
        continue; // Skip duplicates
      }

      // Validate workspace reference
      let workspaceId = collection.workspaceId;
      if (workspaceId && !validWorkspaceIds.has(workspaceId)) {
        workspaceId = DEFAULT_WORKSPACE_ID; // Fallback to default
      }

      newCollections.push({ ...collection, workspaceId });
    }

    const mergedCollections = [...existingCollections, ...newCollections];
    await saveCollections(mergedCollections);
    await initializeInbox(); // Ensure Inbox exists

    // 4. Process links (last)
    const validCollectionIds = new Set(mergedCollections.map((c) => c.id));
    const newLinks: Link[] = [];

    for (const link of file.links) {
      if (existingLinkIds.has(link.id)) {
        continue; // Skip duplicates
      }

      // Validate URL
      if (!isValidUrl(link.url)) {
        continue; // Skip invalid URLs
      }

      // Validate collection reference
      let collectionId = link.collectionId;
      if (!validCollectionIds.has(collectionId)) {
        collectionId = INBOX_COLLECTION_ID; // Fallback to Inbox
      }

      newLinks.push({ ...link, collectionId });
    }

    const mergedLinks = [...existingLinks, ...newLinks];
    await saveLinks(mergedLinks);

    return {
      success: true,
      imported: {
        workspaces: newWorkspaces.length,
        collections: newCollections.length,
        links: newLinks.length,
      },
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      imported: { workspaces: 0, collections: 0, links: 0 },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Exports all workspaces, collections, and links to a backup file.
 * Settings are excluded (device-local preferences).
 */
export async function exportData(): Promise<TabAlaExportFile> {
  const [workspaces, collections, links] = await Promise.all([
    getWorkspaces(),
    getCollections(),
    getLinks(),
  ]);

  return {
    version: '1.0',
    exportedAt: Date.now(),
    source: 'tabala',
    workspaces,
    collections,
    links,
  };
}

/**
 * Downloads export data as a JSON file with YYYY-MM-DD filename.
 */
export function downloadExport(data: TabAlaExportFile): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `tabala-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
