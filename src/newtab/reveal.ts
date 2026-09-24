import { tick } from 'svelte';
import type { Collection, Link } from '@/lib/types';

export const REVEAL_MS = 2000;

/** Workspace that shows the link; Inbox links show in every workspace. */
export function workspaceForLink(link: Link, collections: Collection[], activeWorkspaceId: string): string {
  const collection = collections.find((c) => c.id === link.collectionId);
  return collection?.workspaceId ?? activeWorkspaceId;
}

/** Scrolls to a link card and highlights it. False when the card is not rendered. */
export async function revealLink(linkId: string, root: ParentNode = document): Promise<boolean> {
  await tick();
  const card = Array.from(root.querySelectorAll<HTMLElement>('[data-link-id]'))
    .find((element) => element.dataset.linkId === linkId);
  if (card === undefined) {
    return false;
  }
  card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  card.focus({ preventScroll: true });
  card.classList.add('revealed');
  setTimeout(() => card.classList.remove('revealed'), REVEAL_MS);
  return true;
}
