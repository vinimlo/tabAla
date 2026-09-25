import { describe, it, expect } from 'vitest';
import { highlight } from '@/lib/search/highlight';

describe('highlight', () => {
  it('marks the words that start with a search term, ignoring accents and case', () => {
    expect(highlight('Ações de transformação', ['acoes transf'])).toEqual([
      { text: 'Ações', match: true },
      { text: ' de ', match: false },
      { text: 'transf', match: true },
      { text: 'ormação', match: false },
    ]);
  });

  it('marks the terms of every query, as the translated one', () => {
    expect(highlight('Knapsack tutorial', ['problema da mochila', 'knapsack'])).toEqual([
      { text: 'Knapsack', match: true },
      { text: ' tutorial', match: false },
    ]);
  });

  it('uses the longest term that fits a word', () => {
    expect(highlight('Transformers', ['trans transformer'])).toEqual([
      { text: 'Transformer', match: true },
      { text: 's', match: false },
    ]);
  });

  it('treats symbols in the query as plain text', () => {
    expect(highlight('C++ primer (2nd)', ['c++ ('])).toEqual([
      { text: 'C', match: true },
      { text: '++ primer (2nd)', match: false },
    ]);
  });

  it('leaves the title whole without terms', () => {
    expect(highlight('Anything', [''])).toEqual([{ text: 'Anything', match: false }]);
    expect(highlight('', ['x'])).toEqual([{ text: '', match: false }]);
  });
});
