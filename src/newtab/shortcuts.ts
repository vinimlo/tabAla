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

export type DashboardAction = 'openSearch' | 'closeSearch' | 'closeAll' | 'newCollection' | 'toggleSidebar' | null;

/**
 * Dashboard keyboard shortcuts. While the search panel is open only Esc acts
 * (closing it), so single-letter shortcuts never fire under the panel.
 */
export function dashboardShortcut(event: KeyboardEvent, searchOpen: boolean): DashboardAction {
  if (searchOpen) {
    return event.key === 'Escape' ? 'closeSearch' : null;
  }
  if (opensSearch(event)) {
    return 'openSearch';
  }
  if (event.key === 'Escape') {
    return 'closeAll';
  }
  if (isEditable(event.target) || event.ctrlKey || event.metaKey) {
    return null;
  }
  if (event.key === 'n') {
    return 'newCollection';
  }
  return event.key === 't' ? 'toggleSidebar' : null;
}
