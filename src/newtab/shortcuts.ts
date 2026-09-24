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
