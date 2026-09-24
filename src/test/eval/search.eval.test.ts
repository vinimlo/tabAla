/* eslint-disable no-console -- the harness reports through the console */
/**
 * Offline evaluation of the search: hit@5 by category, with and without tags,
 * and with the query translated when translations.json is present.
 * Skipped unless TABALA_EVAL_DIR points to a folder with export.json,
 * tags.json, gabarito.json and optionally translations.json (spike output).
 * Those files hold personal data and never enter the repository (.eval/ is
 * gitignored).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndex, search, type SearchIndex } from '@/lib/search/engine';
import type { TabAlaExportFile } from '@/lib/storage';
import type { Link } from '@/lib/types';

interface GabaritoItem {
  consulta: string;
  idsEsperados: string[];
  categoria: 'assunto' | 'titulo';
}

const dir = process.env.TABALA_EVAL_DIR;

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(dir ?? '', name), 'utf8')) as T;
}

function top5(index: SearchIndex, phrasings: string[]): string[] {
  const result = search(index, phrasings.map((q) => `${q} `));
  const hits = result.results.length > 0 ? result.results : result.partial;
  return hits.slice(0, 5).map((hit) => hit.link.id);
}

describe.skipIf(dir === undefined)('search evaluation', () => {
  it('prints hit@5 by index and strategy', () => {
    const data = read<TabAlaExportFile>('export.json');
    const { tags } = read<{ tags: Record<string, string[]> }>('tags.json');
    const gabarito = read<GabaritoItem[]>('gabarito.json');
    const translations = existsSync(join(dir ?? '', 'translations.json'))
      ? read<{ translations: Record<string, string> }>('translations.json').translations
      : null;

    const untagged: Link[] = data.links.map(({ tags: _tags, ...link }) => link);
    const tagged: Link[] = untagged.map((link) => (tags[link.id] === undefined ? link : { ...link, tags: tags[link.id] }));
    console.log(`links com tags: ${tagged.filter((link) => link.tags !== undefined).length}/${tagged.length}`);

    const indexes: Record<string, SearchIndex> = {
      semTags: buildIndex(untagged, data.collections, data.workspaces),
      comTags: buildIndex(tagged, data.collections, data.workspaces),
    };
    const strategies: Record<string, (g: GabaritoItem) => string[]> = { original: (g) => [g.consulta] };
    if (translations !== null) {
      strategies['original+traduzida'] = (g) => [g.consulta, translations[g.consulta] ?? g.consulta];
    }

    const rows: { indice: string; estrategia: string; categoria: string; acerto5: string; pct: number }[] = [];
    for (const [indice, index] of Object.entries(indexes)) {
      for (const [estrategia, phrasings] of Object.entries(strategies)) {
        for (const categoria of ['assunto', 'titulo'] as const) {
          const items = gabarito.filter((g) => g.categoria === categoria);
          const misses = items.filter((g) => !g.idsEsperados.some((id) => top5(index, phrasings(g)).includes(id)));
          const hits = items.length - misses.length;
          rows.push({ indice, estrategia, categoria, acerto5: `${hits}/${items.length}`, pct: Math.round((100 * hits) / items.length) });
          for (const miss of misses) {
            console.log(`[${indice}/${estrategia}] errou "${miss.consulta}" -> ${top5(index, phrasings(miss)).join(', ')}`);
          }
        }
      }
    }
    console.table(rows);
    expect(rows.length).toBeGreaterThan(0);
  });
});
