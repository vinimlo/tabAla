/**
 * Unit tests for collection name validation.
 */
import { describe, it, expect } from 'vitest';
import { validateCollectionName, COLLECTION_NAME_ERRORS } from '@/lib/validation';
import type { Collection } from '@/lib/types';

const createMockCollection = (name: string, id = 'col-1'): Collection => ({
  id,
  name,
  order: 0,
});

describe('validateCollectionName', () => {
  describe('empty name validation', () => {
    it('should reject empty string', () => {
      const result = validateCollectionName('', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY);
    });

    it('should reject whitespace-only string', () => {
      const result = validateCollectionName('   ', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY);
    });

    it('should reject tabs and newlines only', () => {
      const result = validateCollectionName('\t\n  ', '', []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.EMPTY);
    });
  });

  describe('duplicate name validation', () => {
    it('should reject exact duplicate name', () => {
      const existingCollections = [createMockCollection('Trabalho')];
      const result = validateCollectionName('Trabalho', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE);
    });

    it('should reject case-insensitive duplicate (lowercase)', () => {
      const existingCollections = [createMockCollection('Trabalho')];
      const result = validateCollectionName('trabalho', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE);
    });

    it('should reject case-insensitive duplicate (uppercase)', () => {
      const existingCollections = [createMockCollection('estudos')];
      const result = validateCollectionName('ESTUDOS', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE);
    });

    it('should reject case-insensitive duplicate (mixed case)', () => {
      const existingCollections = [createMockCollection('MeuProjeto')];
      const result = validateCollectionName('meuprojeto', '', existingCollections);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(COLLECTION_NAME_ERRORS.DUPLICATE);
    });

    it('should allow same name when renaming current collection', () => {
      const existingCollections = [createMockCollection('Trabalho', 'col-1')];
      const result = validateCollectionName('Trabalho', 'col-1', existingCollections);
      expect(result.valid).toBe(true);
    });
  });

  describe('valid name acceptance', () => {
    it('should accept valid unique name', () => {
      const existingCollections = [createMockCollection('Trabalho')];
      const result = validateCollectionName('Estudos', '', existingCollections);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept name with leading/trailing spaces (trimmed)', () => {
      const existingCollections: Collection[] = [];
      const result = validateCollectionName('  Novo Projeto  ', '', existingCollections);
      expect(result.valid).toBe(true);
    });

    it('should accept name when no collections exist', () => {
      const result = validateCollectionName('Primeiro', '', []);
      expect(result.valid).toBe(true);
    });

    it('should accept name similar but not equal to existing', () => {
      const existingCollections = [createMockCollection('Trabalho')];
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
        createMockCollection('Trabalho', 'col-1'),
        createMockCollection('Estudos', 'col-2'),
        createMockCollection('Projetos', 'col-3'),
      ];

      const result1 = validateCollectionName('trabalho', '', existingCollections);
      expect(result1.valid).toBe(false);

      const result2 = validateCollectionName('Novo', '', existingCollections);
      expect(result2.valid).toBe(true);
    });

    it('should handle accented characters', () => {
      const existingCollections = [createMockCollection('Coleção')];
      const result = validateCollectionName('Colecao', '', existingCollections);
      expect(result.valid).toBe(true);
    });

    it('should handle unicode characters', () => {
      const result = validateCollectionName('日本語', '', []);
      expect(result.valid).toBe(true);
    });
  });
});
