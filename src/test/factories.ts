import type { Link, Collection, Workspace } from '@/lib/types';
import { WORKSPACE_COLORS } from '@/lib/types';

export const createMockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: 'col-1',
  name: 'Test Collection',
  order: 0,
  createdAt: Date.now(),
  ...overrides,
});

export const createMockLink = (overrides: Partial<Link> = {}): Link => ({
  id: 'link-1',
  url: 'https://example.com',
  title: 'Example Link',
  collectionId: 'col-1',
  createdAt: Date.now(),
  ...overrides,
});

export const createMockWorkspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: 'ws-1',
  name: 'Test Workspace',
  color: WORKSPACE_COLORS[0],
  order: 0,
  createdAt: Date.now(),
  ...overrides,
});
