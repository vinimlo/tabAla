/**
 * Unit tests for collection name validation.
 */
import { describe, it, expect } from 'vitest';
import {
  validateCollectionName,
  validateWorkspaceName,
  COLLECTION_NAME_ERRORS,
  COLLECTION_NAME_MAX_LENGTH,
  WORKSPACE_ERRORS,
} from '@/lib/validation';
import { createMockCollection } from '../factories';

describe('validateCollectionName', () => {
  describe('empty name validation', () => {
    it('should reject empty string', () => {
      const result = validateCollectionName('', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY());
    });

    it('should reject whitespace-only string', () => {
      const result = validateCollectionName('   ', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY());
    });

    it('should reject tabs and newlines only', () => {
      const result = validateCollectionName('\t\n  ', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY());
    });
  });

  describe('max length validation', () => {
    it('should reject name exceeding max length', () => {
      const longName = 'a'.repeat(COLLECTION_NAME_MAX_LENGTH + 1);
      const result = validateCollectionName(longName, '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.TOO_LONG());
    });

    it('should accept name at exactly max length', () => {
      const exactName = 'a'.repeat(COLLECTION_NAME_MAX_LENGTH);
      const result = validateCollectionName(exactName, '', []);
      expect(result.valid).toBe(true);
    });
  });

  describe('duplicate name validation', () => {
    it('should reject exact duplicate name', () => {
      const existingCollections = [createMockCollection({ name: 'Trabalho' })];
      const result = validateCollectionName('Trabalho', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
    });

    it('should reject case-insensitive duplicate (lowercase)', () => {
      const existingCollections = [createMockCollection({ name: 'Trabalho' })];
      const result = validateCollectionName('trabalho', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
    });

    it('should reject case-insensitive duplicate (uppercase)', () => {
      const existingCollections = [createMockCollection({ name: 'estudos' })];
      const result = validateCollectionName('ESTUDOS', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
    });

    it('should reject case-insensitive duplicate (mixed case)', () => {
      const existingCollections = [createMockCollection({ name: 'MeuProjeto' })];
      const result = validateCollectionName('meuprojeto', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
    });

    it('should allow same name when renaming current collection', () => {
      const existingCollections = [createMockCollection({ name: 'Trabalho', id: 'col-1' })];
      const result = validateCollectionName('Trabalho', 'col-1', existingCollections);
      expect(result.valid).toBe(true);
    });
  });

  describe('valid name acceptance', () => {
    it('should accept valid unique name', () => {
      const existingCollections = [createMockCollection({ name: 'Trabalho' })];
      const result = validateCollectionName('Estudos', '', existingCollections);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept name with leading/trailing spaces (trimmed)', () => {
      const result = validateCollectionName('  Novo Projeto  ', '', []);
      expect(result.valid).toBe(true);
    });

    it('should accept name when no collections exist', () => {
      const result = validateCollectionName('Primeiro', '', []);
      expect(result.valid).toBe(true);
    });

    it('should accept name similar but not equal to existing', () => {
      const existingCollections = [createMockCollection({ name: 'Trabalho' })];
      const result = validateCollectionName('Trabalho2', '', existingCollections);
      expect(result.valid).toBe(true);
    });

    it('should accept name with special characters', () => {
      const result = validateCollectionName('Projeto @#$', '', []);
      expect(result.valid).toBe(true);
    });

    it('should accept name with exactly 100 characters', () => {
      const longName = 'a'.repeat(100);
      const result = validateCollectionName(longName, '', []);
      expect(result.valid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple existing collections', () => {
      const existingCollections = [
        createMockCollection({ name: 'Trabalho', id: 'col-1' }),
        createMockCollection({ name: 'Estudos', id: 'col-2' }),
        createMockCollection({ name: 'Projetos', id: 'col-3' }),
      ];

      const result1 = validateCollectionName('trabalho', '', existingCollections);
      expect(result1.valid).toBe(false);

      const result2 = validateCollectionName('Novo', '', existingCollections);
      expect(result2.valid).toBe(true);
    });

    it('should handle accented characters', () => {
      const existingCollections = [createMockCollection({ name: 'Coleção' })];
      const result = validateCollectionName('Colecao', '', existingCollections);
      expect(result.valid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = validateCollectionName('日本語', '', []);
      expect(result.valid).toBe(true);
    });
  });
});

describe('validateCollectionName (string[] overload)', () => {
  it('should reject duplicate name from string array', () => {
    const result = validateCollectionName('Trabalho', ['Trabalho', 'Estudos']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
  });

  it('should reject case-insensitive duplicate from string array', () => {
    const result = validateCollectionName('trabalho', ['Trabalho']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE());
  });

  it('should accept unique name from string array', () => {
    const result = validateCollectionName('Novo', ['Trabalho', 'Estudos']);
    expect(result.valid).toBe(true);
  });

  it('should reject empty name with string array', () => {
    const result = validateCollectionName('', ['Trabalho']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY());
  });

  it('should accept name with empty string array', () => {
    const result = validateCollectionName('Trabalho', []);
    expect(result.valid).toBe(true);
  });
});

describe('validateWorkspaceName (string[] overload)', () => {
  it('should reject duplicate name from string array', () => {
    const result = validateWorkspaceName('Work', ['Work', 'Personal']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(WORKSPACE_ERRORS.NAME_DUPLICATE());
  });

  it('should reject case-insensitive duplicate from string array', () => {
    const result = validateWorkspaceName('work', ['Work']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(WORKSPACE_ERRORS.NAME_DUPLICATE());
  });

  it('should accept unique name from string array', () => {
    const result = validateWorkspaceName('Projects', ['Work', 'Personal']);
    expect(result.valid).toBe(true);
  });

  it('should reject empty name with string array', () => {
    const result = validateWorkspaceName('', ['Work']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(WORKSPACE_ERRORS.NAME_EMPTY());
  });
});
