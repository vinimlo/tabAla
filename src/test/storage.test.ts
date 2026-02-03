/**
 * Unit tests for the chrome.storage wrapper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockStorage, chromeMock } from './setup';
import { storage, StorageError } from '@/lib/storage';

describe('Storage Wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('get()', () => {
    it('should return value when key exists', async () => {
      mockStorage['testKey'] = 'testValue';

      const result = await storage.get<string>('testKey');

      expect(result).toBe('testValue');
    });

    it('should return null when key does not exist', async () => {
      const result = await storage.get<string>('nonexistent');

      expect(result).toBeNull();
    });

    it('should preserve type for complex objects', async () => {
      const userData = { name: 'John', age: 30, active: true };
      mockStorage['user'] = userData;

      const result = await storage.get<typeof userData>('user');

      expect(result).toEqual(userData);
      expect(result?.name).toBe('John');
      expect(result?.age).toBe(30);
    });

    it('should throw StorageError for empty key', async () => {
      await expect(storage.get('')).rejects.toThrow(StorageError);
      await expect(storage.get('')).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
    });

    it('should throw StorageError for whitespace-only key', async () => {
      await expect(storage.get('   ')).rejects.toThrow(StorageError);
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.get.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      try {
        await storage.get('key');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('CHROME_API_ERROR');
      }
    });
  });

  describe('set()', () => {
    it('should store value correctly', async () => {
      await storage.set('key', 'value');

      expect(mockStorage['key']).toBe('value');
    });

    it('should store complex objects', async () => {
      const data = { nested: { value: 42 }, array: [1, 2, 3] };

      await storage.set('complex', data);

      expect(mockStorage['complex']).toEqual(data);
    });

    it('should throw StorageError for empty key', async () => {
      await expect(storage.set('', 'value')).rejects.toThrow(StorageError);
      await expect(storage.set('', 'value')).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
    });

    it('should throw StorageError for undefined value', async () => {
      await expect(storage.set('key', undefined)).rejects.toThrow(StorageError);
      await expect(storage.set('key', undefined)).rejects.toMatchObject({
        code: 'INVALID_VALUE',
      });
    });

    it('should allow null value', async () => {
      await storage.set('key', null);

      expect(mockStorage['key']).toBeNull();
    });

    it('should throw StorageError with QUOTA_EXCEEDED code when quota is exceeded', async () => {
      chromeMock.storage.local.set.mockRejectedValueOnce(
        new Error('Quota exceeded')
      );

      try {
        await storage.set('key', 'value');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('QUOTA_EXCEEDED');
      }
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.set.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.set('key', 'value')).rejects.toThrow(StorageError);
    });
  });

  describe('remove()', () => {
    it('should remove existing key', async () => {
      mockStorage['toRemove'] = 'value';

      await storage.remove('toRemove');

      expect(mockStorage['toRemove']).toBeUndefined();
    });

    it('should not throw when key does not exist', async () => {
      await expect(storage.remove('nonexistent')).resolves.toBeUndefined();
    });

    it('should throw StorageError for empty key', async () => {
      await expect(storage.remove('')).rejects.toThrow(StorageError);
      await expect(storage.remove('')).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.remove.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      await expect(storage.remove('key')).rejects.toThrow(StorageError);
    });
  });

  describe('clear()', () => {
    it('should remove all stored data', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      mockStorage['key3'] = 'value3';

      await storage.clear();

      expect(Object.keys(mockStorage)).toHaveLength(0);
    });

    it('should not throw when storage is already empty', async () => {
      await expect(storage.clear()).resolves.toBeUndefined();
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.clear.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.clear()).rejects.toThrow(StorageError);
    });
  });

  describe('getAll()', () => {
    it('should return all stored data', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';

      const result = await storage.getAll();

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should return empty object when storage is empty', async () => {
      const result = await storage.getAll();

      expect(result).toEqual({});
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.get.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.getAll()).rejects.toThrow(StorageError);
    });
  });

  describe('getBatch()', () => {
    it('should return multiple values', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';

      const result = await storage.getBatch<string>(['key1', 'key2']);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should return undefined for non-existent keys in batch', async () => {
      mockStorage['key1'] = 'value1';

      const result = await storage.getBatch<string>(['key1', 'nonexistent']);

      expect(result.key1).toBe('value1');
      expect(result.nonexistent).toBeUndefined();
    });

    it('should throw StorageError for empty keys array', async () => {
      await expect(storage.getBatch([])).rejects.toThrow(StorageError);
      await expect(storage.getBatch([])).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
    });

    it('should throw StorageError when keys contain empty string', async () => {
      await expect(storage.getBatch(['valid', ''])).rejects.toThrow(
        StorageError
      );
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.get.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.getBatch(['key'])).rejects.toThrow(StorageError);
    });
  });

  describe('setBatch()', () => {
    it('should store multiple values', async () => {
      await storage.setBatch({
        key1: 'value1',
        key2: 'value2',
      });

      expect(mockStorage['key1']).toBe('value1');
      expect(mockStorage['key2']).toBe('value2');
    });

    it('should throw StorageError for empty items object', async () => {
      await expect(storage.setBatch({})).rejects.toThrow(StorageError);
      await expect(storage.setBatch({})).rejects.toMatchObject({
        code: 'INVALID_VALUE',
      });
    });

    it('should throw StorageError with QUOTA_EXCEEDED when quota is exceeded', async () => {
      chromeMock.storage.local.set.mockRejectedValueOnce(
        new Error('Quota bytes exceeded')
      );

      try {
        await storage.setBatch({ key: 'value' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe('QUOTA_EXCEEDED');
      }
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.set.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.setBatch({ key: 'value' })).rejects.toThrow(
        StorageError
      );
    });
  });

  describe('removeBatch()', () => {
    it('should remove multiple keys', async () => {
      mockStorage['key1'] = 'value1';
      mockStorage['key2'] = 'value2';
      mockStorage['key3'] = 'value3';

      await storage.removeBatch(['key1', 'key2']);

      expect(mockStorage['key1']).toBeUndefined();
      expect(mockStorage['key2']).toBeUndefined();
      expect(mockStorage['key3']).toBe('value3');
    });

    it('should throw StorageError for empty keys array', async () => {
      await expect(storage.removeBatch([])).rejects.toThrow(StorageError);
      await expect(storage.removeBatch([])).rejects.toMatchObject({
        code: 'INVALID_KEY',
      });
    });

    it('should throw StorageError when keys contain empty string', async () => {
      await expect(storage.removeBatch(['valid', ''])).rejects.toThrow(
        StorageError
      );
    });

    it('should throw StorageError when Chrome API fails', async () => {
      chromeMock.storage.local.remove.mockRejectedValueOnce(
        new Error('API failure')
      );

      await expect(storage.removeBatch(['key'])).rejects.toThrow(StorageError);
    });
  });

  describe('watch()', () => {
    it('should register a listener for storage changes', () => {
      const callback = vi.fn();

      storage.watch(callback);

      expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalled();
    });

    it('should return an unwatch function', () => {
      const callback = vi.fn();

      const unwatch = storage.watch(callback);

      expect(typeof unwatch).toBe('function');
    });

    it('should unregister listener when unwatch is called', () => {
      const callback = vi.fn();

      const unwatch = storage.watch(callback);
      unwatch();

      expect(chromeMock.storage.onChanged.removeListener).toHaveBeenCalled();
    });

    it('should invoke callback when storage changes in local area', () => {
      const callback = vi.fn();

      let capturedListener: (
        changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
        areaName: string
      ) => void;
      chromeMock.storage.onChanged.addListener.mockImplementation(
        (listener) => {
          capturedListener = listener;
        }
      );

      storage.watch(callback);

      capturedListener!(
        {
          testKey: { oldValue: 'old', newValue: 'new' },
        },
        'local'
      );

      expect(callback).toHaveBeenCalledWith({
        testKey: { oldValue: 'old', newValue: 'new' },
      });
    });

    it('should not invoke callback when storage changes in other areas', () => {
      const callback = vi.fn();

      let capturedListener: (
        changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
        areaName: string
      ) => void;
      chromeMock.storage.onChanged.addListener.mockImplementation(
        (listener) => {
          capturedListener = listener;
        }
      );

      storage.watch(callback);

      capturedListener!(
        {
          testKey: { oldValue: 'old', newValue: 'new' },
        },
        'sync'
      );

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Integration: Full flow tests', () => {
    it('should support set -> get -> remove flow', async () => {
      await storage.set('flowKey', 'flowValue');
      const retrieved = await storage.get<string>('flowKey');
      expect(retrieved).toBe('flowValue');

      await storage.remove('flowKey');
      const afterRemove = await storage.get<string>('flowKey');
      expect(afterRemove).toBeNull();
    });

    it('should support setBatch -> getBatch -> removeBatch flow', async () => {
      await storage.setBatch({
        batchKey1: 'value1',
        batchKey2: 'value2',
        batchKey3: 'value3',
      });

      const batch = await storage.getBatch<string>([
        'batchKey1',
        'batchKey2',
        'batchKey3',
      ]);
      expect(batch).toEqual({
        batchKey1: 'value1',
        batchKey2: 'value2',
        batchKey3: 'value3',
      });

      await storage.removeBatch(['batchKey1', 'batchKey2']);
      const remaining = await storage.getAll();
      expect(remaining).toEqual({ batchKey3: 'value3' });
    });

    it('should support set -> getAll -> clear flow', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');

      const all = await storage.getAll();
      expect(Object.keys(all)).toHaveLength(2);

      await storage.clear();
      const afterClear = await storage.getAll();
      expect(afterClear).toEqual({});
    });
  });

  describe('StorageError', () => {
    it('should have correct name property', () => {
      const error = new StorageError('Test message', 'INVALID_KEY');

      expect(error.name).toBe('StorageError');
    });

    it('should store original error', () => {
      const originalError = new Error('Original');
      const error = new StorageError(
        'Wrapped',
        'CHROME_API_ERROR',
        originalError
      );

      expect(error.originalError).toBe(originalError);
    });

    it('should have correct code property', () => {
      const error = new StorageError('Test', 'QUOTA_EXCEEDED');

      expect(error.code).toBe('QUOTA_EXCEEDED');
    });
  });
});
