export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** ⌘K / Ctrl+K open the search anywhere; "/" only outside text fields. */
export function opensSearch(event: KeyboardEvent): boolean {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    return true;
  }
  return event.key === '/' && !event.metaKey && !event.ctrlKey && !isEditable(event.target);
}

export type DashboardAction =
  | 'openSearch'
  | 'closeLayer'
  | 'closeAll'
  | 'newCollection'
  | 'toggleSidebar'
  | 'toggleFocus'
  | null;

/**
 * Dashboard keyboard shortcuts. While a layer (search, triage) is open only
 * Esc acts, closing it, so single-letter shortcuts never fire under it.
 */
export function dashboardShortcut(event: KeyboardEvent, layerOpen: boolean): DashboardAction {
  if (layerOpen) {
    return event.key === 'Escape' ? 'closeLayer' : null;
  }
  if (opensSearch(event)) {
    return 'openSearch';
  }
  if (event.key === 'Escape') {
    return 'closeAll';
  }
  if (isEditable(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.key === 'n') {
    return 'newCollection';
  }
  if (event.key === 't') {
    return 'toggleSidebar';
  }
  return event.key === 'f' ? 'toggleFocus' : null;
}
