/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect, beforeEach } from 'vitest';
import { chromeMock } from '../setup';
import { t, plural, formatRelativeTime, getWorkspaceDisplayName, getCollectionDisplayName } from '@lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    chromeMock.i18n.getMessage.mockImplementation(
      (key: string, _subs?: string | string[]) => key
    );
  });

  describe('t()', () => {
    it('returns key when getMessage returns the key (mock behavior)', () => {
      expect(t('common_save')).toBe('common_save');
    });

    it('passes substitutions to getMessage', () => {
      t('success_collection_created', 'MyCollection');
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'success_collection_created',
        ['MyCollection']
      );
    });

    it('converts number substitutions to strings', () => {
      t('popup_view_all', 42);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'popup_view_all',
        ['42']
      );
    });

    it('returns key as fallback when getMessage returns empty string', () => {
      chromeMock.i18n.getMessage.mockReturnValue('');
      expect(t('unknown_key')).toBe('unknown_key');
    });

    it('returns key when chrome.i18n throws', () => {
      chromeMock.i18n.getMessage.mockImplementation(() => {
        throw new Error('API error');
      });
      expect(t('some_key')).toBe('some_key');
    });

    it('returns translated message when getMessage returns a value', () => {
      chromeMock.i18n.getMessage.mockReturnValue('Save');
      expect(t('common_save')).toBe('Save');
    });
  });

  describe('plural()', () => {
    it('uses oneKey for count === 1', () => {
      plural(1, 'statusbar_links_one', 'statusbar_links_many');
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'statusbar_links_one',
        ['1']
      );
    });

    it('uses manyKey for count === 0', () => {
      plural(0, 'statusbar_links_one', 'statusbar_links_many');
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'statusbar_links_many',
        ['0']
      );
    });

    it('uses manyKey for count > 1', () => {
      plural(5, 'statusbar_links_one', 'statusbar_links_many');
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'statusbar_links_many',
        ['5']
      );
    });

    it('passes extra substitutions', () => {
      plural(3, 'success_collection_deleted_moved_one', 'success_collection_deleted_moved_many', 'Work');
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'success_collection_deleted_moved_many',
        ['3', 'Work']
      );
    });
  });

  describe('formatRelativeTime()', () => {
    it('returns time_now key for recent timestamps', () => {
      const now = Date.now();
      const result = formatRelativeTime(now);
      expect(result).toBe('time_now');
    });

    it('returns time_minutes_ago key for timestamps within the hour', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      formatRelativeTime(fiveMinutesAgo);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'time_minutes_ago',
        ['5']
      );
    });

    it('returns time_hour_ago key for 1 hour ago', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      formatRelativeTime(oneHourAgo);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'time_hour_ago',
        ['1']
      );
    });

    it('returns time_hours_ago key for multiple hours ago', () => {
      const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
      formatRelativeTime(threeHoursAgo);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'time_hours_ago',
        ['3']
      );
    });

    it('returns time_day_ago key for 1 day ago', () => {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      formatRelativeTime(oneDayAgo);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'time_day_ago',
        ['1']
      );
    });

    it('returns time_days_ago key for multiple days ago', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      formatRelativeTime(threeDaysAgo);
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith(
        'time_days_ago',
        ['3']
      );
    });
  });

  describe('getWorkspaceDisplayName()', () => {
    it('returns translated name for default workspace', () => {
      const result = getWorkspaceDisplayName({ id: 'general', name: 'Geral' });
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith('default_workspace_name', []);
      expect(result).toBe('default_workspace_name');
    });

    it('returns original name for non-default workspace', () => {
      const result = getWorkspaceDisplayName({ id: 'abc-123', name: 'My Workspace' });
      expect(result).toBe('My Workspace');
    });
  });

  describe('getCollectionDisplayName()', () => {
    it('returns translated name for Inbox collection', () => {
      const result = getCollectionDisplayName({ id: 'inbox', name: 'Inbox' });
      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith('common_inbox', []);
      expect(result).toBe('common_inbox');
    });

    it('returns original name for non-Inbox collection', () => {
      const result = getCollectionDisplayName({ id: 'abc-456', name: 'Reading List' });
      expect(result).toBe('Reading List');
    });
  });
});
