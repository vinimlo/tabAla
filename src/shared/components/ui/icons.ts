/**
 * Icon shapes on a 24×24 grid, stroke 2, round caps (spec §4.5).
 * A shape with `fill` is filled instead of stroked.
 */
export interface IconShape {
  d: string;
  fill?: boolean;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

const GEAR = 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z';

export const ICONS = {
  check: [{ d: 'M20 6 9 17l-5-5' }],
  close: [{ d: 'M18 6 6 18' }, { d: 'm6 6 12 12' }],
  clock: [{ d: circle(12, 12, 9) }, { d: 'M12 7v5l3 2' }],
  more: [{ d: circle(5, 12, 1.6), fill: true }, { d: circle(12, 12, 1.6), fill: true }, { d: circle(19, 12, 1.6), fill: true }],
  'chevron-down': [{ d: 'm6 9 6 6 6-6' }],
  'chevron-right': [{ d: 'm9 6 6 6-6 6' }],
  target: [{ d: circle(12, 12, 9) }, { d: circle(12, 12, 5) }, { d: circle(12, 12, 1.3), fill: true }],
  search: [{ d: circle(11, 11, 7) }, { d: 'm20 20-3.5-3.5' }],
  board: [
    { d: 'M4.5 4h2A1.5 1.5 0 0 1 8 5.5v13A1.5 1.5 0 0 1 6.5 20h-2A1.5 1.5 0 0 1 3 18.5v-13A1.5 1.5 0 0 1 4.5 4Z' },
    { d: 'M11.5 4h2A1.5 1.5 0 0 1 15 5.5v8a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 11.5 4Z' },
    { d: 'M18.5 4h1A1.5 1.5 0 0 1 21 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 17 9.5v-4A1.5 1.5 0 0 1 18.5 4Z' },
  ],
  tabs: [{ d: 'M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z' }, { d: 'M3 9V6a2 2 0 0 1 2-2h5l2 5' }],
  gear: [{ d: circle(12, 12, 3) }, { d: GEAR }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  external: [{ d: 'M14 4h6v6' }, { d: 'M20 4l-9 9' }, { d: 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' }],
  play: [{ d: 'M6 5h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z' }, { d: 'm10 9 5 3-5 3Z', fill: true }],
  paper: [{ d: 'M6 3h8l4 4v14H6Z' }, { d: 'M9 12h6M9 16h6' }],
  chat: [{ d: 'M4 5h16v11H9l-5 4Z' }],
  page: [{ d: 'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z' }, { d: 'M3 9h18' }],
  code: [{ d: 'm8 7-5 5 5 5' }, { d: 'm16 7 5 5-5 5' }],
  docs: [{ d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }, { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z' }],
  repo: [{ d: 'M6 4h11a1 1 0 0 1 1 1v13H7a2 2 0 0 0 0 4h11' }, { d: 'M6 4v16' }],
  reference: [{ d: 'M6 3h12v18l-6-4-6 4Z' }],
  pin: [{ d: 'M9 4h6l-1 6 4 4H6l4-4-1-6Z' }, { d: 'M12 14v6' }],
  'pin-filled': [{ d: 'M9 4h6l-1 6 4 4H6l4-4-1-6Z', fill: true }, { d: 'M12 14v6' }],
  trash: [{ d: 'M4 7h16' }, { d: 'M9 7V4h6v3' }, { d: 'm7 7 1 13h8l1-13' }],
  keep: [{ d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z' }],
  move: [{ d: 'M4 12h14' }, { d: 'm14 7 5 5-5 5' }],
  eye: [{ d: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z' }, { d: circle(12, 12, 3) }],
  alert: [{ d: circle(12, 12, 9) }, { d: 'M12 7.5v5.5' }, { d: 'M12 16.5v.01' }],
  sun: [{ d: circle(12, 12, 4) }, { d: 'M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' }],
  moon: [{ d: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' }],
  folder: [{ d: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' }],
  enter: [{ d: 'M20 5v7a3 3 0 0 1-3 3H5' }, { d: 'm9 11-4 4 4 4' }],
  undo: [{ d: 'M9 14 4 9l5-5' }, { d: 'M4 9h11a5 5 0 0 1 0 10h-3' }],
  globe: [{ d: circle(12, 12, 9) }, { d: 'M3 12h18' }, { d: 'M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z' }],
  download: [{ d: 'M12 4v11' }, { d: 'm7 10 5 5 5-5' }, { d: 'M4 19h16' }],
  upload: [{ d: 'M12 15V4' }, { d: 'm7 9 5-5 5 5' }, { d: 'M4 19h16' }],
  logo: [
    { d: 'M6.5 6h11a1.5 1.5 0 0 1 0 3h-11a1.5 1.5 0 0 1 0-3Z', fill: true },
    { d: 'M6.5 11h7a1.5 1.5 0 0 1 0 3h-7a1.5 1.5 0 0 1 0-3Z', fill: true },
    { d: 'M6.5 16h3a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 1 0-3Z', fill: true },
  ],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;
