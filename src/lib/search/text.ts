/**
 * Search text: accent- and case-insensitive words, a light singular/plural
 * folding, and the query grammar (stopwords and kind words).
 */
import type { LinkKind } from '@/lib/link-kind';

/** A word in two forms: `norm` for prefix matching, `stem` for equality and typos. */
export interface Token {
  norm: string;
  stem: string;
}

export function normalizeWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
}

/** Folds plurals on both sides: agentes, agents -> agent; processos -> processo. */
export function stem(word: string): string {
  if (word.length >= 6 && word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.length >= 4 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export function tokenize(text: string): Token[] {
  return normalizeWords(text).map((norm) => ({ norm, stem: stem(norm) }));
}

const STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na',
  'sobre', 'aquele', 'aquela', 'que', 'um', 'uma', 'para', 'com',
  'the', 'of', 'about', 'an', 'and', 'for', 'on', 'in', 'to', 'with',
]);

/** Site names (github, youtube) are not kind words: they match the domain field. */
const KIND_WORDS: Readonly<Partial<Record<string, LinkKind>>> = {
  video: 'video', videos: 'video',
  paper: 'paper', papers: 'paper', pdf: 'paper', pdfs: 'paper',
  repo: 'repo', repos: 'repo', repositorio: 'repo', repositorios: 'repo',
  issue: 'code-change', issues: 'code-change', pull: 'code-change',
  docs: 'docs', documentacao: 'docs', documentation: 'docs',
  exercicio: 'exercise', exercicios: 'exercise', exercise: 'exercise', exercises: 'exercise',
  conversa: 'chat', conversas: 'chat', chat: 'chat', chats: 'chat',
};

export interface ParsedQuery {
  terms: Token[];
  kinds: LinkKind[];
}

/**
 * Splits a query into search terms and kind filters. The last word, while
 * still being typed (no trailing space), is never dropped as a stopword:
 * "de" on its way to "desafio" already searches by prefix. With
 * kindWords: false, kind words stay as plain terms.
 */
export function parseQuery(query: string, { kindWords = true }: { kindWords?: boolean } = {}): ParsedQuery {
  const words = normalizeWords(query);
  const stillTyping = !/\s$/.test(query);
  const terms: Token[] = [];
  const kinds = new Set<LinkKind>();

  words.forEach((word, i) => {
    const kind = kindWords ? KIND_WORDS[word] : undefined;
    if (kind !== undefined) {
      kinds.add(kind);
      return;
    }
    const isLastTyped = stillTyping && i === words.length - 1;
    if (STOPWORDS.has(word) && !isLastTyped) {
      return;
    }
    terms.push({ norm: word, stem: stem(word) });
  });

  return { terms, kinds: [...kinds] };
}
