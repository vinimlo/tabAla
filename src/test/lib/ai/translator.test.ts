/**
 * Query translation with Chrome's built-in Translator (the only mock).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chromeMock } from '../../setup';
import {
  createQueryTranslator,
  downloadTranslation,
  getTranslationAvailability,
  queryLanguage,
  queryLanguageName,
  topicSearchView,
} from '@/lib/ai/translator';

interface Monitor {
  addEventListener: (type: string, listener: (event: { loaded: number }) => void) => void;
}

type Mock = ReturnType<typeof vi.fn>;

function installTranslator(
  availability: string,
  translate: (text: string) => Promise<string>
): { api: { availability: Mock; create: Mock }; create: Mock; instance: { translate: Mock; destroy: Mock } } {
  const instance = { translate: vi.fn(translate), destroy: vi.fn() };
  const create = vi.fn((options: { monitor?: (monitor: Monitor) => void }) => {
    options.monitor?.({ addEventListener: (_type, listener) => listener({ loaded: 1 }) });
    return Promise.resolve(instance);
  });
  const api = { availability: vi.fn(() => Promise.resolve(availability)), create };
  (globalThis as Record<string, unknown>).Translator = api;
  return { api, create, instance };
}

beforeEach(() => {
  chromeMock.i18n.getUILanguage.mockReturnValue('pt-BR');
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).Translator;
  chromeMock.i18n.getUILanguage.mockReturnValue('en');
});

function readLanguages(languages: string[]): void {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
}

describe('queryLanguage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the interface language without region, and none when everything is English', () => {
    expect(queryLanguage()).toBe('pt');
    chromeMock.i18n.getUILanguage.mockReturnValue('en-US');
    readLanguages(['en-US', 'en']);
    expect(queryLanguage()).toBeNull();
  });

  it('with the interface in English, uses the first other language the user reads', () => {
    chromeMock.i18n.getUILanguage.mockReturnValue('en-US');
    readLanguages(['en-US', 'en', 'pt-BR', 'es']);
    expect(queryLanguage()).toBe('pt');
  });
});

describe('queryLanguageName', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the query language in the interface language', () => {
    expect(queryLanguageName()).toBe('português');
    chromeMock.i18n.getUILanguage.mockReturnValue('en-US');
    readLanguages(['en-US', 'en', 'pt']);
    expect(queryLanguageName()).toBe('Portuguese');
  });

  it('is null when every language is English', () => {
    chromeMock.i18n.getUILanguage.mockReturnValue('en-US');
    readLanguages(['en-US', 'en']);
    expect(queryLanguageName()).toBeNull();
  });
});

describe('getTranslationAvailability', () => {
  it('is unavailable without the Translator API', async () => {
    expect(await getTranslationAvailability()).toBe('unavailable');
  });

  it('asks Chrome about the interface language into English', async () => {
    const { api } = installTranslator('downloadable', (text) => Promise.resolve(text));
    expect(await getTranslationAvailability()).toBe('downloadable');
    expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'pt', targetLanguage: 'en' });
  });

  it('is unavailable when the interface and every language the user reads are English', async () => {
    installTranslator('available', (text) => Promise.resolve(text));
    chromeMock.i18n.getUILanguage.mockReturnValue('en');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'en']);
    expect(await getTranslationAvailability()).toBe('unavailable');
    vi.restoreAllMocks();
  });

  it('with Chrome in English, asks about the other language the user reads', async () => {
    const { api } = installTranslator('available', (text) => Promise.resolve(text));
    chromeMock.i18n.getUILanguage.mockReturnValue('en-US');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US', 'en', 'pt']);
    expect(await getTranslationAvailability()).toBe('available');
    expect(api.availability).toHaveBeenCalledWith({ sourceLanguage: 'pt', targetLanguage: 'en' });
    vi.restoreAllMocks();
  });
});

describe('createQueryTranslator', () => {
  it('translates with one translator per page, keeping the trailing space', async () => {
    const { create } = installTranslator('available', (text) =>
      Promise.resolve(text === 'problema da mochila' ? 'knapsack problem' : 'binary search'));
    const translate = createQueryTranslator();

    expect(await translate('problema da mochila ')).toBe('knapsack problem ');
    expect(await translate('busca binária')).toBe('binary search');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('drops a translation that only changes the case', async () => {
    installTranslator('available', (text) => Promise.resolve(text.toUpperCase()));
    expect(await createQueryTranslator()('openrouter')).toBeNull();
  });

  it('gives nothing while the translator is not ready', async () => {
    const { create } = installTranslator('downloadable', (text) => Promise.resolve(text));
    expect(await createQueryTranslator()('mochila')).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('gives nothing when the translation fails', async () => {
    installTranslator('available', () => Promise.reject(new Error('translation failed')));
    expect(await createQueryTranslator()('mochila')).toBeNull();
  });

  it('gives nothing for an empty query', async () => {
    const { create } = installTranslator('available', (text) => Promise.resolve(text));
    expect(await createQueryTranslator()('   ')).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('downloadTranslation', () => {
  it('creates the translator from a click, reporting progress, and frees it', async () => {
    const { instance } = installTranslator('downloadable', (text) => Promise.resolve(text));
    const progress: number[] = [];

    await downloadTranslation((fraction) => progress.push(fraction));

    expect(progress).toEqual([1]);
    expect(instance.destroy).toHaveBeenCalledTimes(1);
  });
});

describe('topicSearchView', () => {
  it.each([
    ['unavailable', null, 'unavailable'],
    ['downloadable', null, 'enable'],
    ['downloadable', 0.4, 'downloading'],
    ['downloading', null, 'downloading'],
    ['available', null, 'toggle'],
  ] as const)('%s with progress %s shows %s', (availability, progress, view) => {
    expect(topicSearchView(availability, progress)).toBe(view);
  });
});
