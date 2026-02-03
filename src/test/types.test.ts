/**
 * Unit tests for core types and validation functions.
 */
import { describe, it, expect } from 'vitest';
import type { Link, Collection, InboxCollection } from '@/lib/types';
import {
  generateId,
  isValidHexColor,
  isValidUrl,
  isInboxCollection,
  INBOX_COLLECTION_ID,
  INBOX_COLLECTION_NAME,
} from '@/lib/types';

describe('Link interface', () => {
  it('should accept a valid Link with all required fields', () => {
    const link: Link = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com',
      title: 'Example Page',
      collectionId: 'inbox',
      createdAt: Date.now(),
    };

    expect(link.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(link.url).toBe('https://example.com');
    expect(link.title).toBe('Example Page');
    expect(link.collectionId).toBe('inbox');
    expect(typeof link.createdAt).toBe('number');
    expect(link.favicon).toBeUndefined();
  });

  it('should accept a valid Link with optional favicon', () => {
    const link: Link = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      url: 'https://example.com',
      title: 'Example Page',
      collectionId: 'inbox',
      createdAt: Date.now(),
      favicon: 'https://example.com/favicon.ico',
    };

    expect(link.favicon).toBe('https://example.com/favicon.ico');
  });

  it('should work with arrays of Links', () => {
    const links: Link[] = [
      {
        id: '1',
        url: 'https://example1.com',
        title: 'Example 1',
        collectionId: 'inbox',
        createdAt: Date.now(),
      },
      {
        id: '2',
        url: 'https://example2.com',
        title: 'Example 2',
        collectionId: 'reading',
        createdAt: Date.now(),
        favicon: 'https://example2.com/icon.png',
      },
    ];

    expect(links).toHaveLength(2);
    expect(links[0].favicon).toBeUndefined();
    expect(links[1].favicon).toBeDefined();
  });
});

describe('Collection interface', () => {
  it('should accept a valid Collection with all required fields', () => {
    const collection: Collection = {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      name: 'Reading List',
      createdAt: Date.now(),
    };

    expect(collection.id).toBe('7c9e6679-7425-40de-944b-e07fc1f90ae7');
    expect(collection.name).toBe('Reading List');
    expect(typeof collection.createdAt).toBe('number');
    expect(collection.color).toBeUndefined();
  });

  it('should accept a valid Collection with optional color', () => {
    const collection: Collection = {
      id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      name: 'Work',
      createdAt: Date.now(),
      color: '#FF5733',
    };

    expect(collection.color).toBe('#FF5733');
  });

  it('should work with arrays of Collections', () => {
    const collections: Collection[] = [
      {
        id: 'inbox',
        name: 'Inbox',
        createdAt: Date.now(),
      },
      {
        id: 'work',
        name: 'Work',
        createdAt: Date.now(),
        color: '#3498DB',
      },
    ];

    expect(collections).toHaveLength(2);
    expect(collections[0].color).toBeUndefined();
    expect(collections[1].color).toBe('#3498DB');
  });
});

describe('generateId()', () => {
  it('should return a string in UUID v4 format', () => {
    const id = generateId();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(typeof id).toBe('string');
    expect(id).toMatch(uuidV4Regex);
  });

  it('should generate unique IDs on each call', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    expect(ids.size).toBe(100);
  });
});

describe('isValidHexColor()', () => {
  describe('valid colors', () => {
    it('should return true for valid 6-digit hex color', () => {
      expect(isValidHexColor('#FF5733')).toBe(true);
    });

    it('should return true for valid 3-digit hex color', () => {
      expect(isValidHexColor('#F57')).toBe(true);
    });

    it('should return true for lowercase hex color', () => {
      expect(isValidHexColor('#ff5733')).toBe(true);
    });

    it('should return true for mixed case hex color', () => {
      expect(isValidHexColor('#Ff5733')).toBe(true);
    });

    it('should return true for #000000 (black)', () => {
      expect(isValidHexColor('#000000')).toBe(true);
    });

    it('should return true for #FFF (white short)', () => {
      expect(isValidHexColor('#FFF')).toBe(true);
    });
  });

  describe('invalid colors', () => {
    it('should return false for color without # prefix', () => {
      expect(isValidHexColor('FF5733')).toBe(false);
    });

    it('should return false for color with invalid hex characters', () => {
      expect(isValidHexColor('#GG5733')).toBe(false);
    });

    it('should return false for 4-digit hex (invalid length)', () => {
      expect(isValidHexColor('#FF57')).toBe(false);
    });

    it('should return false for 5-digit hex (invalid length)', () => {
      expect(isValidHexColor('#FF573')).toBe(false);
    });

    it('should return false for 7-digit hex (invalid length)', () => {
      expect(isValidHexColor('#FF57333')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidHexColor('')).toBe(false);
    });

    it('should return false for just #', () => {
      expect(isValidHexColor('#')).toBe(false);
    });

    it('should return false for rgb() format', () => {
      expect(isValidHexColor('rgb(255, 87, 51)')).toBe(false);
    });

    it('should return false for color name', () => {
      expect(isValidHexColor('red')).toBe(false);
    });
  });
});

describe('isValidUrl()', () => {
  describe('valid URLs', () => {
    it('should return true for https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should return true for http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should return true for URL with path', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should return true for URL with query params', () => {
      expect(isValidUrl('https://example.com?foo=bar&baz=qux')).toBe(true);
    });

    it('should return true for URL with port', () => {
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should return true for URL with hash', () => {
      expect(isValidUrl('https://example.com/page#section')).toBe(true);
    });

    it('should return false for chrome-extension URL (restricted protocol)', () => {
      expect(isValidUrl('chrome-extension://abcdef123456/popup.html')).toBe(false);
    });

    it('should return true for file URL', () => {
      expect(isValidUrl('file:///path/to/file.html')).toBe(true);
    });
  });

  describe('invalid URLs', () => {
    it('should return false for plain text', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should return false for URL without protocol', () => {
      expect(isValidUrl('example.com')).toBe(false);
    });

    it('should return false for malformed URL', () => {
      expect(isValidUrl('http://')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidUrl(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidUrl(undefined as unknown as string)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isValidUrl(12345 as unknown as string)).toBe(false);
    });

    it('should return false for javascript protocol', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should return false for data protocol', () => {
      expect(isValidUrl('data:text/html,<h1>Hello</h1>')).toBe(false);
    });
  });
});

describe('Inbox constants', () => {
  it('INBOX_COLLECTION_ID should be "inbox"', () => {
    expect(INBOX_COLLECTION_ID).toBe('inbox');
  });

  it('INBOX_COLLECTION_NAME should be "Inbox"', () => {
    expect(INBOX_COLLECTION_NAME).toBe('Inbox');
  });
});

describe('InboxCollection interface', () => {
  it('should accept a valid InboxCollection', () => {
    const inbox: InboxCollection = {
      id: INBOX_COLLECTION_ID,
      name: 'Inbox',
      order: 0,
      createdAt: Date.now(),
      isDefault: true,
    };

    expect(inbox.id).toBe('inbox');
    expect(inbox.isDefault).toBe(true);
  });
});

describe('isInboxCollection', () => {
  it('should return true for collection with inbox id', () => {
    const inbox: Collection = {
      id: INBOX_COLLECTION_ID,
      name: 'Inbox',
      order: 0,
    };
    expect(isInboxCollection(inbox)).toBe(true);
  });

  it('should return false for collection with different id', () => {
    const collection: Collection = {
      id: 'other',
      name: 'Other',
      order: 1,
    };
    expect(isInboxCollection(collection)).toBe(false);
  });

  it('should return false for collection with similar id', () => {
    const collection: Collection = {
      id: 'inbox2',
      name: 'Inbox 2',
      order: 1,
    };
    expect(isInboxCollection(collection)).toBe(false);
  });
});

describe('Type integration', () => {
  it('should allow Link.collectionId to reference Collection.id', () => {
    const collection: Collection = {
      id: 'reading-list',
      name: 'Reading List',
      createdAt: Date.now(),
      color: '#3498DB',
    };

    const link: Link = {
      id: generateId(),
      url: 'https://example.com/article',
      title: 'Interesting Article',
      collectionId: collection.id,
      createdAt: Date.now(),
    };

    expect(link.collectionId).toBe(collection.id);
  });

  it('should work with generateId() for creating new entities', () => {
    const collection: Collection = {
      id: generateId(),
      name: 'New Collection',
      createdAt: Date.now(),
    };

    const link: Link = {
      id: generateId(),
      url: 'https://example.com',
      title: 'New Link',
      collectionId: collection.id,
      createdAt: Date.now(),
    };

    expect(collection.id).not.toBe(link.id);
    expect(link.collectionId).toBe(collection.id);
  });
});
