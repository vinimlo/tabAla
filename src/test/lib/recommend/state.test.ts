/**
 * Link lifecycle: completed, reference, snoozed, pending.
 */
import { describe, it, expect } from 'vitest';
import { isCompleted, isPending, isReference, isSnoozed } from '@/lib/recommend/state';
import { createMockCollection, createMockLink } from '../../factories';

const now = new Date(2026, 8, 24, 10).getTime();
const tomorrowStart = new Date(2026, 8, 25).getTime();

describe('link state', () => {
  const plain = createMockCollection({ id: 'c' });
  const referenceCollection = createMockCollection({ id: 'r', reference: true });

  it('a link with completedAt is completed', () => {
    expect(isCompleted(createMockLink({ completedAt: 1 }))).toBe(true);
    expect(isCompleted(createMockLink())).toBe(false);
  });

  it('a link follows its collection unless it says otherwise', () => {
    expect(isReference(createMockLink({ collectionId: 'r' }), referenceCollection)).toBe(true);
    expect(isReference(createMockLink({ collectionId: 'r', reference: false }), referenceCollection)).toBe(false);
    expect(isReference(createMockLink({ reference: true }), plain)).toBe(true);
    expect(isReference(createMockLink(), undefined)).toBe(false);
  });

  it('a snoozed link comes back at the start of the chosen day', () => {
    const link = createMockLink({ snoozedUntil: tomorrowStart });
    expect(isSnoozed(link, now)).toBe(true);
    expect(isSnoozed(link, new Date(2026, 8, 25, 0, 1).getTime())).toBe(false);
  });

  it('pending means not completed, not reference and not snoozed', () => {
    expect(isPending(createMockLink(), plain, now)).toBe(true);
    expect(isPending(createMockLink({ completedAt: 1 }), plain, now)).toBe(false);
    expect(isPending(createMockLink({ collectionId: 'r' }), referenceCollection, now)).toBe(false);
    expect(isPending(createMockLink({ snoozedUntil: tomorrowStart }), plain, now)).toBe(false);
  });
});
