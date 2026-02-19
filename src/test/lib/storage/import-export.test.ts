/**
 * Unit tests for import/export functionality.
 * Tests validation, preview, and merge operations with referential integrity.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateExportFile,
  previewImport,
  executeImport,
  exportData,
  type TabAlaExportFile,
} from '@/lib/storage/import-export';
import * as dataAccess from '@/lib/storage/data-access';
import { createMockLink, createMockCollection, createMockWorkspace } from '../../factories';
import {
  INBOX_COLLECTION_ID,
  DEFAULT_WORKSPACE_ID,
  WORKSPACE_COLORS,
} from '@/lib/types';

// Mock storage functions
vi.mock('@/lib/storage/data-access');
vi.mock('@/lib/storage/collections');
vi.mock('@/lib/storage/workspaces');

describe('validateExportFile', () => {
  it('should accept a valid export file', () => {
    const validFile: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [
        createMockWorkspace({ id: 'ws-1', color: '#E85D42' }),
      ],
      collections: [
        createMockCollection({ id: 'col-1', workspaceId: 'ws-1' }),
      ],
      links: [
        createMockLink({ id: 'link-1', url: 'https://example.com' }),
      ],
    };

    expect(() => validateExportFile(validFile)).not.toThrow();
  });

  it('should reject non-object data', () => {
    expect(() => validateExportFile(null)).toThrow('must be a JSON object');
    expect(() => validateExportFile('string')).toThrow('must be a JSON object');
    expect(() => validateExportFile(123)).toThrow('must be a JSON object');
  });

  it('should reject files without source: "tabala"', () => {
    const invalidFile = {
      version: '1.0',
      source: 'other',
      workspaces: [],
      collections: [],
      links: [],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('not a TabAla backup');
  });

  it('should reject files without version', () => {
    const invalidFile = {
      source: 'tabala',
      workspaces: [],
      collections: [],
      links: [],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('missing or invalid version');
  });

  it('should reject files with non-array workspaces', () => {
    const invalidFile = {
      version: '1.0',
      source: 'tabala',
      workspaces: 'not-array',
      collections: [],
      links: [],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('workspaces must be an array');
  });

  it('should reject workspace with invalid color', () => {
    const invalidFile = {
      version: '1.0',
      source: 'tabala',
      workspaces: [
        { id: 'ws-1', name: 'Test', color: 'invalid', order: 0, createdAt: Date.now() },
      ],
      collections: [],
      links: [],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('invalid color format');
  });

  it('should reject collection without required fields', () => {
    const invalidFile = {
      version: '1.0',
      source: 'tabala',
      workspaces: [],
      collections: [
        { id: 'col-1', name: 'Test' }, // missing order
      ],
      links: [],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('missing or invalid order');
  });

  it('should reject link without URL', () => {
    const invalidFile = {
      version: '1.0',
      source: 'tabala',
      workspaces: [],
      collections: [],
      links: [
        { id: 'link-1', title: 'Test', collectionId: 'col-1', createdAt: Date.now() },
      ],
    };

    expect(() => validateExportFile(invalidFile)).toThrow('missing or invalid url');
  });
});

describe('previewImport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should count new items correctly', async () => {
    // Mock existing data
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([
      createMockWorkspace({ id: 'existing-ws' }),
    ]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([
      createMockCollection({ id: 'existing-col' }),
    ]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([
      createMockLink({ id: 'existing-link' }),
    ]);

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [
        createMockWorkspace({ id: 'new-ws' }),
        createMockWorkspace({ id: 'existing-ws' }), // duplicate
      ],
      collections: [
        createMockCollection({ id: 'new-col', workspaceId: 'new-ws' }),
      ],
      links: [
        createMockLink({ id: 'new-link', collectionId: 'new-col' }),
      ],
    };

    const preview = await previewImport(file);

    expect(preview.workspaces).toBe(1); // only new-ws
    expect(preview.collections).toBe(1); // only new-col
    expect(preview.links).toBe(1); // only new-link
    expect(preview.warnings).toHaveLength(0);
  });

  it('should warn about invalid URLs', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [createMockCollection({ id: 'col-1' })],
      links: [
        createMockLink({ id: 'link-1', url: 'https://valid.com' }),
        createMockLink({ id: 'link-2', url: 'invalid-url' }),
        createMockLink({ id: 'link-3', url: 'also-invalid' }),
      ],
    };

    const preview = await previewImport(file);

    expect(preview.links).toBe(1); // only valid link counted
    expect(preview.warnings).toContain('2 links with invalid URLs will be skipped');
  });

  it('should warn about orphan collections', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [
        createMockCollection({ id: 'col-1', workspaceId: 'non-existent-ws' }),
        createMockCollection({ id: 'col-2', workspaceId: 'also-non-existent' }),
      ],
      links: [],
    };

    const preview = await previewImport(file);

    expect(preview.warnings).toContain('2 collections will be moved to General workspace');
  });

  it('should warn about orphan links', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [],
      links: [
        createMockLink({ id: 'link-1', collectionId: 'non-existent-col' }),
      ],
    };

    const preview = await previewImport(file);

    expect(preview.warnings).toContain('1 links will be moved to Inbox');
  });
});

describe('executeImport', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should merge workspaces correctly', async () => {
    const existingWorkspace = createMockWorkspace({ id: 'existing-ws' });

    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([existingWorkspace]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const newWorkspace = createMockWorkspace({ id: 'new-ws', color: '#D4726A' });
    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [newWorkspace],
      collections: [],
      links: [],
    };

    const result = await executeImport(file);

    expect(result.success).toBe(true);
    expect(result.imported.workspaces).toBe(1);
    expect(vi.mocked(dataAccess.saveWorkspaces)).toHaveBeenCalledWith([
      existingWorkspace,
      newWorkspace,
    ]);
  });

  it('should skip duplicate workspaces', async () => {
    const existing = createMockWorkspace({ id: 'ws-1' });

    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([existing]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [createMockWorkspace({ id: 'ws-1' })], // duplicate
      collections: [],
      links: [],
    };

    const result = await executeImport(file);

    expect(result.success).toBe(true);
    expect(result.imported.workspaces).toBe(0);
  });

  it('should fallback invalid workspace color', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [
        { ...createMockWorkspace({ id: 'ws-1' }), color: 'invalid' },
      ],
      collections: [],
      links: [],
    };

    await executeImport(file);

    const savedWorkspaces = vi.mocked(dataAccess.saveWorkspaces).mock.calls[0][0];
    expect(savedWorkspaces[0].color).toBe(WORKSPACE_COLORS[0]);
  });

  it('should assign orphan collections to default workspace', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [
        createMockCollection({ id: 'col-1', workspaceId: 'non-existent' }),
      ],
      links: [],
    };

    await executeImport(file);

    const savedCollections = vi.mocked(dataAccess.saveCollections).mock.calls[0][0];
    expect(savedCollections[0].workspaceId).toBe(DEFAULT_WORKSPACE_ID);
  });

  it('should skip links with invalid URLs', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([
      createMockCollection({ id: 'col-1' }),
    ]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [],
      links: [
        createMockLink({ id: 'link-1', url: 'invalid-url', collectionId: 'col-1' }),
        createMockLink({ id: 'link-2', url: 'https://valid.com', collectionId: 'col-1' }),
      ],
    };

    const result = await executeImport(file);

    expect(result.imported.links).toBe(1); // only valid link
  });

  it('should assign orphan links to Inbox', async () => {
    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue([]);
    vi.mocked(dataAccess.getCollections).mockResolvedValue([]);
    vi.mocked(dataAccess.getLinks).mockResolvedValue([]);
    vi.mocked(dataAccess.saveWorkspaces).mockResolvedValue();
    vi.mocked(dataAccess.saveCollections).mockResolvedValue();
    vi.mocked(dataAccess.saveLinks).mockResolvedValue();

    const file: TabAlaExportFile = {
      version: '1.0',
      exportedAt: Date.now(),
      source: 'tabala',
      workspaces: [],
      collections: [],
      links: [
        createMockLink({ id: 'link-1', collectionId: 'non-existent' }),
      ],
    };

    await executeImport(file);

    const savedLinks = vi.mocked(dataAccess.saveLinks).mock.calls[0][0];
    expect(savedLinks[0].collectionId).toBe(INBOX_COLLECTION_ID);
  });
});

describe('exportData', () => {
  it('should export all data with correct structure', async () => {
    const mockWorkspaces = [createMockWorkspace()];
    const mockCollections = [createMockCollection()];
    const mockLinks = [createMockLink()];

    vi.mocked(dataAccess.getWorkspaces).mockResolvedValue(mockWorkspaces);
    vi.mocked(dataAccess.getCollections).mockResolvedValue(mockCollections);
    vi.mocked(dataAccess.getLinks).mockResolvedValue(mockLinks);

    const exported = await exportData();

    expect(exported.version).toBe('1.0');
    expect(exported.source).toBe('tabala');
    expect(exported.exportedAt).toBeGreaterThan(0);
    expect(exported.workspaces).toEqual(mockWorkspaces);
    expect(exported.collections).toEqual(mockCollections);
    expect(exported.links).toEqual(mockLinks);
  });
});
