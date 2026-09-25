/**
 * The design tokens of spec §4: themed in both themes, one scale for both apps,
 * and only the bundled fonts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const file = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8');
const tokens = file('src/shared/styles/tokens.css');

function block(selector: string): string {
  const start = tokens.indexOf(selector);
  expect(start).toBeGreaterThan(-1);
  return tokens.slice(start, tokens.indexOf('}', start));
}

const THEMED = [
  '--surface-well', '--surface-tile', '--accent-ink', '--accent-line', '--success-soft', '--semantic-warning',
  '--warning-soft', '--state-hover', '--state-pressed', '--scrim', '--shadow-lift', '--shadow-float', '--text-on-accent',
];

describe('design tokens', () => {
  it.each(['[data-theme="dark"] {', '[data-theme="light"] {'])('%s defines every themed token', (selector) => {
    const body = block(selector);
    for (const token of THEMED) {
      expect(body).toContain(`${token}:`);
    }
  });

  it('defines the type scale, controls and radii once for both apps', () => {
    for (const token of ['--text-2xs', '--text-display', '--control-sm', '--control-md', '--control-lg', '--radius-xl', '--font-display', '--space-8']) {
      expect(tokens).toContain(`${token}:`);
    }
  });

  it('loads only the bundled fonts', () => {
    const css = [tokens, file('src/newtab/app.css'), file('src/popup/app.css')].join('\n');
    expect(css).not.toMatch(/"Inter"|General Sans|JetBrains Mono|fonts\.googleapis/);
    expect(tokens).toContain('url("/fonts/instrument-sans.woff2")');
    expect(tokens).toContain('url("/fonts/instrument-sans-condensed.woff2")');
  });

  it('keeps both font files within 42 KB and ships their license', () => {
    const size = (name: string): number => statSync(join(process.cwd(), 'public/fonts', name)).size;
    expect(size('instrument-sans.woff2') + size('instrument-sans-condensed.woff2')).toBeLessThanOrEqual(42 * 1024);
    expect(file('public/fonts/OFL.txt')).toContain('SIL OPEN FONT LICENSE');
  });
});
