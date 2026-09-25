/**
 * Both locales carry the same keys, and every key the code asks for exists.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ACTION_KEYS, ROLE_KEYS, TRIAGE_KEYS } from '@/newtab/next-up-labels';
import { KIND_LABEL_KEYS } from '@/lib/search/labels';

type Messages = Record<string, { message: string }>;

const read = (locale: string): Messages =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/_locales', locale, 'messages.json'), 'utf8')) as Messages;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'test' ? [] : sources(path);
    }
    return /\.(ts|svelte)$/.test(name) ? [path] : [];
  });
}

const en = read('en');
const ptBR = read('pt_BR');

describe('locales', () => {
  it('en and pt_BR have the same keys', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
  });

  it('every key written in the code exists', () => {
    const keys = new Set<string>();
    for (const file of sources(join(process.cwd(), 'src'))) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\bt\(\s*'([a-z0-9_]+)'/g)) {
        keys.add(match[1]);
      }
      for (const match of text.matchAll(/\bplural\([^,()]+,\s*'([a-z0-9_]+)',\s*'([a-z0-9_]+)'/g)) {
        keys.add(match[1]);
        keys.add(match[2]);
      }
    }
    for (const map of [ACTION_KEYS, ROLE_KEYS, TRIAGE_KEYS, KIND_LABEL_KEYS]) {
      for (const key of Object.values(map)) {
        keys.add(key);
      }
    }
    expect([...keys].filter((key) => !(key in en)).sort()).toEqual([]);
  });
});
