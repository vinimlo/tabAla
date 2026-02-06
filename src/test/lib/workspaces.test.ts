/**
 * Unit tests for workspace functionality.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStorage } from '../setup';
import {
  getWorkspaces,
  saveWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  updateWorkspaceOrder,
  getCollectionsByWorkspace,
  moveCollectionToWorkspace,
  migrateToWorkspaces,
  createDefaultWorkspace,
  initializeDefaultWorkspace,
  getCollections,
  saveCollections,
} from '@/lib/storage';
import {
  validateWorkspaceName,
  validateWorkspaceDescription,
  validateWorkspaceColor,
  validateWorkspaceLimit,
  validateWorkspaceDeletion,
  WORKSPACE_ERRORS,
} from '@/lib/validation';
import type { Workspace, Collection } from '@/lib/types';
import { DEFAULT_WORKSPACE_ID, WORKSPACE_LIMIT, WORKSPACE_COLORS, INBOX_COLLECTION_ID } from '@/lib/types';

const createMockWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  color: WORKSPACE_COLORS[0],
  order: 0,
  createdAt: Date.now(),
  ...overrides,
});

const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'Test Collection',
  order: 0,
  ...overrides,
});

describe('Workspace Storage Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('getWorkspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const workspaces = await getWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return workspaces sorted by order', async () => {
      const ws1 = createMockWorkspace({ id: 'ws-1', order: 2 });
      const ws2 = createMockWorkspace({ id: 'ws-2', order: 0 });
      const ws3 = createMockWorkspace({ id: 'ws-3', order: 1 });
      await saveWorkspaces([ws1, ws2, ws3]);

      const workspaces = await getWorkspaces();
      expect(workspaces[0].id).toBe('ws-2');
      expect(workspaces[1].id).toBe('ws-3');
      expect(workspaces[2].id).toBe('ws-1');
    });
  });

  describe('createDefaultWorkspace', () => {
    it('should create default workspace with correct properties', () => {
      const defaultWs = createDefaultWorkspace();

      expect(defaultWs.id).toBe(DEFAULT_WORKSPACE_ID);
      expect(defaultWs.name).toBe('Geral');
      expect(defaultWs.isDefault).toBe(true);
      expect(defaultWs.color).toBe(WORKSPACE_COLORS[0]);
      expect(defaultWs.order).toBe(0);
    });
  });

  describe('initializeDefaultWorkspace', () => {
    it('should create default workspace if none exists', async () => {
      await initializeDefaultWorkspace();

      const workspaces = await getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe(DEFAULT_WORKSPACE_ID);
    });

    it('should not create duplicate if default already exists', async () => {
      const defaultWs = createMockWorkspace({ id: DEFAULT_WORKSPACE_ID, isDefault: true });
      await saveWorkspaces([defaultWs]);

      await initializeDefaultWorkspace();

      const workspaces = await getWorkspaces();
      expect(workspaces).toHaveLength(1);
    });
  });

  describe('createWorkspace', () => {
    beforeEach(async () => {
      await initializeDefaultWorkspace();
    });

    it('should create a new workspace with valid input', async () => {
      const result = await createWorkspace({
        name: 'New Workspace',
        description: 'Test description',
        color: WORKSPACE_COLORS[1],
      });

      expect(result.name).toBe('New Workspace');
      expect(result.description).toBe('Test description');
      expect(result.color).toBe(WORKSPACE_COLORS[1]);
      expect(result.id).toBeDefined();

      const workspaces = await getWorkspaces();
      expect(workspaces).toHaveLength(2);
    });

    it('should throw error for duplicate name', async () => {
      await expect(
        createWorkspace({
          name: 'Geral',
          color: WORKSPACE_COLORS[0],
        })
      ).rejects.toThrow();
    });

    it('should throw error when limit is reached', async () => {
      // Create WORKSPACE_LIMIT - 1 workspaces (one already exists)
      for (let i = 0; i < WORKSPACE_LIMIT - 1; i++) {
        await createWorkspace({
          name: `Workspace ${i}`,
          color: WORKSPACE_COLORS[i % WORKSPACE_COLORS.length],
        });
      }

      await expect(
        createWorkspace({
          name: 'One More',
          color: WORKSPACE_COLORS[0],
        })
      ).rejects.toThrow();
    });
  });

  describe('updateWorkspace', () => {
    beforeEach(async () => {
      await initializeDefaultWorkspace();
    });

    it('should update workspace name', async () => {
      const ws = await createWorkspace({ name: 'Test', color: WORKSPACE_COLORS[0] });

      const result = await updateWorkspace(ws.id, { name: 'Updated Name' });

      expect(result.success).toBe(true);
      const workspaces = await getWorkspaces();
      const updated = workspaces.find((w) => w.id === ws.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should not allow renaming default workspace', async () => {
      const result = await updateWorkspace(DEFAULT_WORKSPACE_ID, { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('padrão');
    });

    it('should allow updating default workspace color', async () => {
      const result = await updateWorkspace(DEFAULT_WORKSPACE_ID, { color: WORKSPACE_COLORS[2] });

      expect(result.success).toBe(true);
      const workspaces = await getWorkspaces();
      const defaultWs = workspaces.find((w) => w.id === DEFAULT_WORKSPACE_ID);
      expect(defaultWs?.color).toBe(WORKSPACE_COLORS[2]);
    });
  });

  describe('deleteWorkspace', () => {
    beforeEach(async () => {
      await initializeDefaultWorkspace();
    });

    it('should delete workspace and move collections to default', async () => {
      const ws = await createWorkspace({ name: 'To Delete', color: WORKSPACE_COLORS[0] });
      const collection = createMockCollection({ id: 'col-1', workspaceId: ws.id });
      await saveCollections([collection]);

      const result = await deleteWorkspace(ws.id);

      expect(result.success).toBe(true);

      const workspaces = await getWorkspaces();
      expect(workspaces.find((w) => w.id === ws.id)).toBeUndefined();

      const collections = await getCollections();
      expect(collections[0].workspaceId).toBe(DEFAULT_WORKSPACE_ID);
    });

    it('should not allow deleting default workspace', async () => {
      const result = await deleteWorkspace(DEFAULT_WORKSPACE_ID);

      expect(result.success).toBe(false);
      expect(result.error).toContain('padrão');
    });
  });

  describe('updateWorkspaceOrder', () => {
    it('should update workspace order', async () => {
      const ws1 = createMockWorkspace({ id: 'ws-1', order: 0 });
      const ws2 = createMockWorkspace({ id: 'ws-2', order: 1 });
      await saveWorkspaces([ws1, ws2]);

      const result = await updateWorkspaceOrder([ws2, ws1]);

      expect(result.success).toBe(true);

      const workspaces = await getWorkspaces();
      expect(workspaces[0].id).toBe('ws-2');
      expect(workspaces[0].order).toBe(0);
      expect(workspaces[1].id).toBe('ws-1');
      expect(workspaces[1].order).toBe(1);
    });
  });

  describe('getCollectionsByWorkspace', () => {
    it('should return collections for specific workspace', async () => {
      const col1 = createMockCollection({ id: 'col-1', workspaceId: 'ws-1' });
      const col2 = createMockCollection({ id: 'col-2', workspaceId: 'ws-2' });
      const col3 = createMockCollection({ id: 'col-3', workspaceId: 'ws-1' });
      await saveCollections([col1, col2, col3]);

      const collections = await getCollectionsByWorkspace('ws-1');

      expect(collections).toHaveLength(2);
      expect(collections.every((c) => c.workspaceId === 'ws-1')).toBe(true);
    });
  });

  describe('moveCollectionToWorkspace', () => {
    beforeEach(async () => {
      await initializeDefaultWorkspace();
      const ws = createMockWorkspace({ id: 'ws-2' });
      await saveWorkspaces([...(await getWorkspaces()), ws]);
    });

    it('should move collection to different workspace', async () => {
      const collection = createMockCollection({ id: 'col-1', workspaceId: DEFAULT_WORKSPACE_ID });
      await saveCollections([collection]);

      const result = await moveCollectionToWorkspace('col-1', 'ws-2');

      expect(result.success).toBe(true);

      const collections = await getCollections();
      expect(collections[0].workspaceId).toBe('ws-2');
    });

    it('should not allow moving Inbox', async () => {
      const inbox = createMockCollection({ id: INBOX_COLLECTION_ID });
      await saveCollections([inbox]);

      const result = await moveCollectionToWorkspace(INBOX_COLLECTION_ID, 'ws-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Inbox');
    });

    it('should fail if workspace does not exist', async () => {
      const collection = createMockCollection({ id: 'col-1' });
      await saveCollections([collection]);

      const result = await moveCollectionToWorkspace('col-1', 'non-existent');

      expect(result.success).toBe(false);
    });
  });

  describe('migrateToWorkspaces', () => {
    it('should create default workspace and update collections', async () => {
      const col1 = createMockCollection({ id: 'col-1' });
      const col2 = createMockCollection({ id: 'col-2' });
      const inbox = createMockCollection({ id: INBOX_COLLECTION_ID });
      await saveCollections([col1, col2, inbox]);

      await migrateToWorkspaces();

      const workspaces = await getWorkspaces();
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].id).toBe(DEFAULT_WORKSPACE_ID);

      const collections = await getCollections();
      const col1Updated = collections.find((c) => c.id === 'col-1');
      const col2Updated = collections.find((c) => c.id === 'col-2');
      const inboxUpdated = collections.find((c) => c.id === INBOX_COLLECTION_ID);

      expect(col1Updated?.workspaceId).toBe(DEFAULT_WORKSPACE_ID);
      expect(col2Updated?.workspaceId).toBe(DEFAULT_WORKSPACE_ID);
      expect(inboxUpdated?.workspaceId).toBeUndefined();
    });

    it('should be idempotent', async () => {
      await migrateToWorkspaces();
      await migrateToWorkspaces();

      const workspaces = await getWorkspaces();
      expect(workspaces).toHaveLength(1);
    });
  });
});

describe('Workspace Validation', () => {
  const existingWorkspaces = [
    createMockWorkspace({ id: 'ws-1', name: 'Trabalho' }),
    createMockWorkspace({ id: 'ws-2', name: 'Pessoal' }),
  ];

  describe('validateWorkspaceName', () => {
    it('should reject empty name', () => {
      const result = validateWorkspaceName('', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.NAME_EMPTY);
    });

    it('should reject name too long', () => {
      const longName = 'a'.repeat(51);
      const result = validateWorkspaceName(longName, '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.NAME_TOO_LONG);
    });

    it('should reject duplicate name', () => {
      const result = validateWorkspaceName('Trabalho', '', existingWorkspaces);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.NAME_DUPLICATE);
    });

    it('should reject case-insensitive duplicate', () => {
      const result = validateWorkspaceName('trabalho', '', existingWorkspaces);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.NAME_DUPLICATE);
    });

    it('should accept valid unique name', () => {
      const result = validateWorkspaceName('Novo', '', existingWorkspaces);
      expect(result.valid).toBe(true);
    });

    it('should allow same name when editing same workspace', () => {
      const result = validateWorkspaceName('Trabalho', 'ws-1', existingWorkspaces);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateWorkspaceDescription', () => {
    it('should accept empty description', () => {
      const result = validateWorkspaceDescription('');
      expect(result.valid).toBe(true);
    });

    it('should accept valid description', () => {
      const result = validateWorkspaceDescription('A valid description');
      expect(result.valid).toBe(true);
    });

    it('should reject description too long', () => {
      const longDesc = 'a'.repeat(201);
      const result = validateWorkspaceDescription(longDesc);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.DESCRIPTION_TOO_LONG);
    });
  });

  describe('validateWorkspaceColor', () => {
    it('should accept valid hex color', () => {
      const result = validateWorkspaceColor('#3B82F6');
      expect(result.valid).toBe(true);
    });

    it('should accept short hex color', () => {
      const result = validateWorkspaceColor('#FFF');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid color', () => {
      const result = validateWorkspaceColor('not-a-color');
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.INVALID_COLOR);
    });
  });

  describe('validateWorkspaceLimit', () => {
    it('should accept when under limit', () => {
      const result = validateWorkspaceLimit([createMockWorkspace()]);
      expect(result.valid).toBe(true);
    });

    it('should reject when at limit', () => {
      const workspaces = Array.from({ length: WORKSPACE_LIMIT }, (_, i) =>
        createMockWorkspace({ id: `ws-${i}` })
      );
      const result = validateWorkspaceLimit(workspaces);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.LIMIT_REACHED);
    });
  });

  describe('validateWorkspaceDeletion', () => {
    it('should reject deleting default workspace', () => {
      const workspaces = [
        createMockWorkspace({ id: DEFAULT_WORKSPACE_ID, isDefault: true }),
      ];
      const result = validateWorkspaceDeletion(DEFAULT_WORKSPACE_ID, workspaces);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.DEFAULT_DELETE);
    });

    it('should reject deleting non-existent workspace', () => {
      const workspaces = [createMockWorkspace({ id: 'ws-1' })];
      const result = validateWorkspaceDeletion('non-existent', workspaces);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(WORKSPACE_ERRORS.NOT_FOUND);
    });

    it('should accept deleting regular workspace', () => {
      const workspaces = [
        createMockWorkspace({ id: DEFAULT_WORKSPACE_ID, isDefault: true }),
        createMockWorkspace({ id: 'ws-2' }),
      ];
      const result = validateWorkspaceDeletion('ws-2', workspaces);
      expect(result.valid).toBe(true);
    });
  });
});
