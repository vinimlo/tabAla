/**
 * Search text: accents, case, plurals, stopwords and kind words.
 */
import { describe, it, expect } from 'vitest';
import { normalizeWords, stem, parseQuery } from '@/lib/search/text';

describe('normalizeWords', () => {
  it.each([
    ['Busca Híbrida', ['busca', 'hibrida']],
    ['Query-Adaptive Hybrid Search (PDF)', ['query', 'adaptive', 'hybrid', 'search', 'pdf']],
    ['node.js & C++', ['node', 'js', 'c']],
    ['   ', []],
  ])('%j', (text, words) => {
    expect(normalizeWords(text)).toEqual(words);
  });
});

describe('stem', () => {
  it.each([
    ['agentes', 'agent'],
    ['agents', 'agent'],
    ['processos', 'processo'],
    ['process', 'process'],
    ['notes', 'note'],
    ['classes', 'class'],
    ['bus', 'bus'],
  ])('%s -> %s', (word, expected) => {
    expect(stem(word)).toBe(expected);
  });
});

describe('parseQuery', () => {
  it.each([
    ['vídeo agentes ', ['agent'], ['video']],
    ['vídeo', [], ['video']],
    ['paper de busca híbrida ', ['busca', 'hibrida'], ['paper']],
    ['de', ['de'], []],
    ['de ', [], []],
    ['github', ['github'], []],
    ['!!!', [], []],
  ])('%j', (query, stems, kinds) => {
    const parsed = parseQuery(query);
    expect(parsed.terms.map((term) => term.stem)).toEqual(stems);
    expect(parsed.kinds).toEqual(kinds);
  });
});
