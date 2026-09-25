/** How long a recommendation takes, given the active time already spent on it (spec §6.3). */
export interface TimeLeft {
  /** Minutes spent, rounded. */
  spent: number;
  /** Share of the estimate spent, 0–1; 0 when nothing was spent. */
  progress: number;
  /** estimate: nothing spent; left: under the estimate; over: estimate reached. */
  kind: 'estimate' | 'left' | 'over';
  /** The estimate, what is left, or what was spent, in minutes. */
  minutes: number;
}

export function timeLeft(activeMs: number, effort: number): TimeLeft {
  const spent = Math.round(activeMs / 60_000);
  if (spent <= 0) {
    return { spent: 0, progress: 0, kind: 'estimate', minutes: effort };
  }
  if (spent < effort) {
    return { spent, progress: spent / effort, kind: 'left', minutes: effort - spent };
  }
  return { spent, progress: 1, kind: 'over', minutes: spent };
}
