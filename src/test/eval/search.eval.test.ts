/**
 * Offline evaluation of the search: hit@5 with and without tags, by category.
 * Skipped unless TABALA_EVAL_DIR points to a folder with export.json,
 * tags.json (spike output) and gabarito.json. Those files hold personal data
 * and never enter the repository (.eval/ is gitignored).
 */
/* eslint-disable no-console -- the harness reports through the console */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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

function top5(index: SearchIndex, query: string): string[] {
  const result = search(index, `${query} `);
  const hits = result.results.length > 0 ? result.results : result.partial;
  return hits.slice(0, 5).map((hit) => hit.link.id);
}

describe.skipIf(dir === undefined)('search evaluation', () => {
  it('prints hit@5 with and without tags', () => {
    const data = read<TabAlaExportFile>('export.json');
    const { tags } = read<{ tags: Record<string, string[]> }>('tags.json');
    const gabarito = read<GabaritoItem[]>('gabarito.json');

    const untagged: Link[] = data.links.map(({ tags: _tags, ...link }) => link);
    const tagged: Link[] = untagged.map((link) => (tags[link.id] === undefined ? link : { ...link, tags: tags[link.id] }));
    const coverage = tagged.filter((link) => link.tags !== undefined).length;
    console.log(`links com tags: ${coverage}/${tagged.length}`);

    const modes: Record<string, SearchIndex> = {
      semTags: buildIndex(untagged, data.collections, data.workspaces),
      comTags: buildIndex(tagged, data.collections, data.workspaces),
    };
    const rows: { modo: string; categoria: string; acerto5: string; pct: number }[] = [];
    for (const [modo, index] of Object.entries(modes)) {
      for (const categoria of ['assunto', 'titulo'] as const) {
        const items = gabarito.filter((g) => g.categoria === categoria);
        const misses = items.filter((g) => !g.idsEsperados.some((id) => top5(index, g.consulta).includes(id)));
        const hits = items.length - misses.length;
        rows.push({ modo, categoria, acerto5: `${hits}/${items.length}`, pct: Math.round((100 * hits) / items.length) });
        for (const miss of misses) {
          console.log(`[${modo}] errou "${miss.consulta}" -> ${top5(index, miss.consulta).join(', ')}`);
        }
      }
    }
    console.table(rows);
    expect(rows).toHaveLength(4);
  });
});
