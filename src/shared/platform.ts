/** Key names of the platform, for keyboard hints. */
function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function modLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

export function altLabel(): string {
  return isMac() ? '⌥' : 'Alt';
}
