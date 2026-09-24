/** Translated names and labels for search results (uses chrome.i18n). */
import { getCollectionDisplayName, getWorkspaceDisplayName } from '@/lib/i18n';
import type { LinkKind } from '@/lib/link-kind';
import type { IndexNames, SearchHit } from './engine';

export const displayNames: IndexNames = {
  collection: getCollectionDisplayName,
  workspace: getWorkspaceDisplayName,
};

export const KIND_LABEL_KEYS: Record<LinkKind, string> = {
  video: 'kind_video',
  paper: 'kind_paper',
  repo: 'kind_repo',
  'code-change': 'kind_code_change',
  docs: 'kind_docs',
  exercise: 'kind_exercise',
  social: 'kind_social',
  search: 'kind_search',
  file: 'kind_file',
  page: 'kind_page',
};

/** "Workspace › Collection"; Inbox links show only the collection. */
export function hitPath(hit: SearchHit): string {
  return hit.workspaceName === undefined
    ? hit.collectionName
    : `${hit.workspaceName} › ${hit.collectionName}`;
}
