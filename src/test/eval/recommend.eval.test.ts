/* eslint-disable no-console -- the harness reports through the console */
/**
 * Dry run of the recommender on a real export: prints the strip, triage,
 * fronts and sessions so the weights can be reviewed before any UI exists.
 * Skipped unless TABALA_EVAL_DIR points to a folder with export.json and,
 * optionally, activity.json (an Activity map simulating usage). Those files
 * hold personal data and never enter the repository (.eval/ is gitignored).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildQueue } from '@/lib/recommend/engine';
import { buildSession, SESSION_OPTIONS } from '@/lib/recommend/session';
import { dayKey } from '@/lib/recommend/dates';
import type { TabAlaExportFile } from '@/lib/storage';
import type { Activity, Collection } from '@/lib/types';

const dir = process.env.TABALA_EVAL_DIR;

function read<T>(name: string): T {
  return JSON.parse(readFileSync(join(dir ?? '', name), 'utf8')) as T;
}

describe.skipIf(dir === undefined)('recommendation dry run', () => {
  it('prints what the strip, triage, fronts and sessions would show', () => {
    const data = read<TabAlaExportFile>('export.json');
    const activity = existsSync(join(dir ?? '', 'activity.json')) ? read<Activity>('activity.json') : {};
    const now = Date.now();
    const workspaceNames = new Map(data.workspaces.map((w) => [w.id, w.name]));
    const path = (c: Collection): string => `${workspaceNames.get(c.workspaceId ?? '') ?? '(global)'} › ${c.name}`;

    const queue = buildQueue({ links: data.links, collections: data.collections, activity, now });
    console.log(`\nfila: ${queue.size} (elegíveis ${queue.size - queue.triage.length}, triagem ${queue.triage.length})`);

    console.log('\n== Faixa');
    for (const slot of queue.slots) {
      console.log(`  [${slot.role}] ${path(slot.collection)} — ${JSON.stringify(slot.reason)}`);
      console.log(`      ${slot.action} "${slot.link.title}" (~${slot.effort} min, ${slot.kind})`);
    }

    const byReason = queue.triage.reduce<Record<string, number>>((counts, item) => {
      counts[item.reason] = (counts[item.reason] ?? 0) + 1;
      return counts;
    }, {});
    console.log('\n== Triagem', byReason);
    for (const item of queue.triage.slice(0, 10)) {
      console.log(`  [${item.reason}] ${dayKey(item.link.createdAt)} "${item.link.title}"`);
    }

    console.log('\n== Frentes (top 12)');
    for (const front of queue.fronts.slice(0, 12)) {
      console.log(`  ${path(front.collection)}: ${front.eligible.length} elegíveis, momento ${front.momentum}, último toque ${dayKey(front.lastTouch)}`);
    }

    for (const minutes of SESSION_OPTIONS) {
      console.log(`\n== Sessão de ${minutes} min`);
      for (const item of buildSession(queue, minutes)) {
        console.log(item.type === 'triage'
          ? `  triar ${item.count}`
          : `  ${item.rec.action} "${item.rec.link.title}" ~${item.rec.effort} min${item.overBudget ? ' (passa do tempo)' : ''}`);
      }
    }

    expect(queue.size).toBeGreaterThanOrEqual(0);
  });
});
