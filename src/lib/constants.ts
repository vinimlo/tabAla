/**
 * Application-wide constants for TabAla extension.
 *
 * @module constants
 */

/**
 * Number of items to render per batch for lazy loading.
 * Used for pagination/infinite scroll in the UI.
 */
export const BATCH_SIZE = 50;

/**
 * Error messages for storage operations.
 */
export const STORAGE_ERRORS = {
  QUOTA_EXCEEDED:
    'Storage quota exceeded. Please remove some collections or links to continue.',
  LINK_NOT_FOUND: 'Link not found',
  COLLECTION_NOT_FOUND: 'Coleção não encontrada',
  INBOX_DELETE_FORBIDDEN: 'A coleção Inbox não pode ser excluída',
  RENAME_FAILED: 'Erro ao renomear coleção',
  MOVE_LINKS_FAILED: 'Erro ao mover links',
  DELETE_COLLECTION_FAILED: 'Não foi possível excluir a coleção. Tente novamente',
} as const;

/**
 * Success messages for UI feedback.
 */
export const SUCCESS_MESSAGES = {
  LINK_SAVED: 'Link salvo!',
  COLLECTION_CREATED: (name: string) => `Coleção "${name}" criada!`,
  COLLECTION_DELETED: (name: string, movedCount: number) =>
    movedCount > 0
      ? `Coleção ${name} excluída. ${movedCount} ${movedCount === 1 ? 'link movido' : 'links movidos'} para Inbox`
      : `Coleção ${name} excluída`,
} as const;

/**
 * Error messages for UI feedback.
 */
export const UI_ERRORS = {
  OPEN_LINK_FAILED: 'Erro ao abrir link. Tente novamente.',
  REMOVE_LINK_FAILED: 'Erro ao remover link. Tente novamente.',
  GET_CURRENT_TAB_FAILED: 'Não foi possível obter a aba atual.',
  PAGE_NOT_SAVEABLE: 'Esta página não pode ser salva.',
  SAVE_LINK_FAILED: 'Erro ao salvar link. Tente novamente.',
  CREATE_COLLECTION_FAILED: 'Erro ao criar coleção. Tente novamente.',
  DELETE_COLLECTION_FAILED: 'Erro ao excluir coleção. Tente novamente.',
  RENAME_COLLECTION_FAILED: 'Erro ao renomear. Tente novamente.',
} as const;
