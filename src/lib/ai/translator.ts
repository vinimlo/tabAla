/**
 * Query translation with Chrome's built-in Translator, on the device. A query
 * typed in the interface language also runs in English, where most saved
 * titles are. The TS DOM lib has no types for this API.
 */
export type ModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface TranslatorInstance {
  translate(text: string): Promise<string>;
  destroy(): void;
}

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
}

interface LanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslatorApi {
  availability(options: LanguagePair): Promise<ModelAvailability>;
  create(options: LanguagePair & { monitor?: (monitor: DownloadMonitor) => void }): Promise<TranslatorInstance>;
}

const TARGET_LANGUAGE = 'en';

function translatorApi(): TranslatorApi | undefined {
  return (globalThis as { Translator?: TranslatorApi }).Translator;
}

/** Interface language without region ('pt-BR' -> 'pt'); null when it is English. */
export function queryLanguage(): string | null {
  const language = chrome.i18n.getUILanguage().split('-')[0].toLowerCase();
  return language === TARGET_LANGUAGE ? null : language;
}

function languagePair(): LanguagePair | null {
  const source = queryLanguage();
  return source === null ? null : { sourceLanguage: source, targetLanguage: TARGET_LANGUAGE };
}

export async function getTranslationAvailability(): Promise<ModelAvailability> {
  const api = translatorApi();
  const pair = languagePair();
  if (api === undefined || pair === null) {
    return 'unavailable';
  }
  try {
    return await api.availability(pair);
  } catch {
    return 'unavailable';
  }
}

/** Must run from a click: Chrome downloads the language pack only after a user gesture. */
export async function downloadTranslation(onProgress: (fraction: number) => void): Promise<void> {
  const api = translatorApi();
  const pair = languagePair();
  if (api === undefined || pair === null) {
    throw new Error('Translation is not available');
  }
  const translator = await api.create({
    ...pair,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => onProgress(event.loaded));
    },
  });
  translator.destroy();
}

export type TranslateQuery = (query: string) => Promise<string | null>;

/**
 * Translates queries with one translator per page, created on first use.
 * Gives null when translation is not ready, fails, or returns the same text.
 * Keeps the query's trailing space, which tells the search a word is finished.
 */
export function createQueryTranslator(): TranslateQuery {
  let translator: Promise<TranslatorInstance | null> | null = null;

  async function open(): Promise<TranslatorInstance | null> {
    const api = translatorApi();
    const pair = languagePair();
    if (api === undefined || pair === null || (await api.availability(pair)) !== 'available') {
      return null;
    }
    return api.create(pair);
  }

  return async (query) => {
    const text = query.trim();
    if (text === '') {
      return null;
    }
    translator ??= open().catch(() => null);
    const instance = await translator;
    if (instance === null) {
      return null;
    }
    try {
      const translated = (await instance.translate(text)).trim();
      if (translated === '' || translated.toLowerCase() === text.toLowerCase()) {
        return null;
      }
      return /\s$/.test(query) ? `${translated} ` : translated;
    } catch {
      return null;
    }
  };
}

export type TopicSearchView = 'unavailable' | 'enable' | 'downloading' | 'toggle';

/** What the Settings section shows for the translator state. */
export function topicSearchView(availability: ModelAvailability, progress: number | null): TopicSearchView {
  if (progress !== null || availability === 'downloading') {
    return 'downloading';
  }
  if (availability === 'unavailable') {
    return 'unavailable';
  }
  return availability === 'downloadable' ? 'enable' : 'toggle';
}
