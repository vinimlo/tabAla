import { describe, it, expect } from 'vitest';
import { pendingSummary } from '@/newtab/header';
import { createMockCollection, createMockLink } from '../factories';

const inbox = createMockCollection({ id: 'inbox', name: 'Inbox', isDefault: true });
const reading = createMockCollection({ id: 'r', name: 'Leituras', workspaceId: 'general' });
const refs = createMockCollection({ id: 'refs', name: 'Referência', workspaceId: 'general', reference: true });

describe('pendingSummary', () => {
  it('counts pending links and the collections that hold them', () => {
    const links = [
      createMockLink({ id: 'a', collectionId: 'inbox' }),
      createMockLink({ id: 'b', collectionId: 'r' }),
      createMockLink({ id: 'c', collectionId: 'r', snoozedUntil: Date.now() + 86_400_000 }),
      createMockLink({ id: 'd', collectionId: 'r', completedAt: 1 }),
      createMockLink({ id: 'e', collectionId: 'r', reference: true }),
      createMockLink({ id: 'f', collectionId: 'refs' }),
      createMockLink({ id: 'g', collectionId: 'refs', reference: false }),
      createMockLink({ id: 'h', collectionId: 'elsewhere' }),
    ];

    expect(pendingSummary(links, [inbox, reading, refs])).toEqual({ links: 4, collections: 3 });
  });

  it('is zero with nothing pending', () => {
    expect(pendingSummary([], [inbox])).toEqual({ links: 0, collections: 0 });
  });
});
