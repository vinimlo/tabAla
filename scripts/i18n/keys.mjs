#!/usr/bin/env node
/**
 * Adds, changes or removes messages in both locales without reformatting them.
 *   node scripts/i18n/keys.mjs add <file.json>    new keys
 *   node scripts/i18n/keys.mjs set <file.json>    new text for existing keys
 *   node scripts/i18n/keys.mjs remove <key> ...   drops keys
 * <file.json>: { "key": { "en": "...", "pt_BR": "...", "placeholders": { "name": "$1" } } }
 * Runs in the container: docker compose run --rm app node scripts/i18n/keys.mjs ...
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LOCALES = ['en', 'pt_BR'];
const path = (locale) => `public/_locales/${locale}/messages.json`;

function entryText(key, message, placeholders) {
  const lines = [`  ${JSON.stringify(key)}: {`, `    "message": ${JSON.stringify(message)}${placeholders ? ',' : ''}`];
  if (placeholders) {
    lines.push('    "placeholders": {');
    const names = Object.keys(placeholders);
    names.forEach((name, i) => {
      lines.push(`      ${JSON.stringify(name)}: {`, `        "content": ${JSON.stringify(placeholders[name])}`);
      lines.push(`      }${i < names.length - 1 ? ',' : ''}`);
    });
    lines.push('    }');
  }
  lines.push('  }');
  return lines.join('\n');
}

function entryRange(lines, key) {
  const start = lines.findIndex((line) => line.startsWith(`  ${JSON.stringify(key)}: {`));
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    depth += (lines[i].match(/{/g) ?? []).length - (lines[i].match(/}/g) ?? []).length;
    if (depth === 0) {
      return [start, i];
    }
  }
  throw new Error(`${key}: unbalanced entry`);
}

function write(locale, text) {
  JSON.parse(text);
  writeFileSync(path(locale), text);
}

function add(file) {
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  for (const locale of LOCALES) {
    const text = readFileSync(path(locale), 'utf8');
    const existing = JSON.parse(text);
    const blocks = Object.entries(entries).map(([key, value]) => {
      if (key in existing) {
        throw new Error(`${locale}: ${key} already exists`);
      }
      if (typeof value[locale] !== 'string') {
        throw new Error(`${key}: missing ${locale}`);
      }
      return entryText(key, value[locale], value.placeholders);
    });
    const head = text.slice(0, text.lastIndexOf('}')).replace(/\s*$/, '');
    write(locale, `${head},\n\n${blocks.join(',\n')}\n}\n`);
  }
}

function set(file) {
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  for (const locale of LOCALES) {
    const lines = readFileSync(path(locale), 'utf8').split('\n');
    for (const [key, value] of Object.entries(entries)) {
      const range = entryRange(lines, key);
      if (range === null) {
        throw new Error(`${locale}: ${key} not found`);
      }
      const at = lines.findIndex((line, i) => i > range[0] && i <= range[1] && line.includes('"message":'));
      lines[at] = lines[at].replace(/"message": ".*?"(,?)$/, `"message": ${JSON.stringify(value[locale])}$1`);
    }
    write(locale, lines.join('\n'));
  }
}

function remove(keys) {
  for (const locale of LOCALES) {
    const lines = readFileSync(path(locale), 'utf8').split('\n');
    for (const key of keys) {
      const range = entryRange(lines, key);
      if (range === null) {
        throw new Error(`${locale}: ${key} not found`);
      }
      lines.splice(range[0], range[1] - range[0] + 1);
    }
    const text = lines.join('\n').replace(/,?\s*\n}\s*$/, '\n}\n').replace(/\n{3,}/g, '\n\n');
    write(locale, text);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'add') {
  add(args[0]);
} else if (command === 'set') {
  set(args[0]);
} else if (command === 'remove') {
  remove(args);
} else {
  throw new Error('usage: keys.mjs add|set <file.json> | remove <key>...');
}
