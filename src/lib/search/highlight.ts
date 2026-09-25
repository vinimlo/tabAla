/**
 * The parts of a title that match the search (spec §8.3): a word matches
 * when it starts with a search term, as the engine matches by prefix.
 */
import { parseQuery } from './text';

export interface Segment {
  text: string;
  match: boolean;
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** How many characters of `word` hold its first `letters` folded letters. */
function prefixLength(word: string, letters: number): number {
  let folded = 0;
  let length = 0;
  for (const char of word) {
    if (folded >= letters) {
      break;
    }
    folded += fold(char).length;
    length += char.length;
  }
  return length;
}

export function highlight(title: string, queries: string[]): Segment[] {
  const terms = [...new Set(queries.flatMap((query) => parseQuery(query).terms.map((term) => term.norm)))];
  if (terms.length === 0 || title === '') {
    return [{ text: title, match: false }];
  }
  const segments: Segment[] = [];
  let last = 0;
  for (const found of title.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = found[0];
    const start = found.index ?? 0;
    const folded = fold(word);
    const term = terms.filter((candidate) => folded.startsWith(candidate)).sort((a, b) => b.length - a.length)[0];
    if (term === undefined) {
      continue;
    }
    const end = start + prefixLength(word, term.length);
    if (start > last) {
      segments.push({ text: title.slice(last, start), match: false });
    }
    segments.push({ text: title.slice(start, end), match: true });
    last = end;
  }
  if (last < title.length) {
    segments.push({ text: title.slice(last), match: false });
  }
  return segments;
}
