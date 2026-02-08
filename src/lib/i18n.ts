import { DEFAULT_WORKSPACE_ID, INBOX_COLLECTION_ID } from './types';

/** Returns a localized string, falling back to the key itself. */
export function t(key: string, ...substitutions: (string | number)[]): string {
  try {
    const subs = substitutions.map(String);
    const message = chrome.i18n.getMessage(key, subs);
    return message || key;
  } catch {
    return key;
  }
}

/** Selects between a singular and plural key based on count. */
export function plural(
  count: number,
  oneKey: string,
  manyKey: string,
  ...substitutions: (string | number)[]
): string {
  const key = count === 1 ? oneKey : manyKey;
  return t(key, count, ...substitutions);
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return t('time_now');
  }
  if (hours < 1) {
    return t('time_minutes_ago', minutes);
  }
  if (days < 1) {
    return plural(hours, 'time_hour_ago', 'time_hours_ago');
  }
  return plural(days, 'time_day_ago', 'time_days_ago');
}

/** The default workspace name is translated via i18n; others use their stored name. */
export function getWorkspaceDisplayName(workspace: { id: string; name: string }): string {
  return workspace.id === DEFAULT_WORKSPACE_ID ? t('default_workspace_name') : workspace.name;
}

/** The Inbox name is translated via i18n; other collections use their stored name. */
export function getCollectionDisplayName(collection: { id: string; name: string }): string {
  return collection.id === INBOX_COLLECTION_ID ? t('common_inbox') : collection.name;
}
