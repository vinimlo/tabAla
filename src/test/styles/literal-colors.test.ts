/**
 * Components color through tokens (spec §4.1): no hex colors, and rgba()
 * only inside shadows.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'test' ? [] : svelteFiles(path);
    }
    return name.endsWith('.svelte') ? [path] : [];
  });
}

describe('component styles', () => {
  it('use tokens instead of literal colors', () => {
    const offenders: string[] = [];
    for (const file of svelteFiles(join(process.cwd(), 'src'))) {
      readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
        const hex = /#[0-9a-fA-F]{3,8}\b/.test(line);
        const rgba = /rgba?\(/.test(line) && !/shadow/.test(line) && !/^\s+(inset\s|\d)/.test(line);
        if (hex || rgba) {
          offenders.push(`${file.replace(process.cwd(), '')}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
