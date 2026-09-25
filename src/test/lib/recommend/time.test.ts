import { describe, it, expect } from 'vitest';
import { timeLeft } from '@/lib/recommend/time';

describe('timeLeft', () => {
  it('is the estimate when nothing was spent', () => {
    expect(timeLeft(0, 20)).toEqual({ spent: 0, progress: 0, kind: 'estimate', minutes: 20 });
    expect(timeLeft(20_000, 20)).toEqual({ spent: 0, progress: 0, kind: 'estimate', minutes: 20 });
  });

  it('is what is left while under the estimate', () => {
    expect(timeLeft(18 * 60_000, 20)).toEqual({ spent: 18, progress: 0.9, kind: 'left', minutes: 2 });
  });

  it('is the time spent once the estimate is reached', () => {
    expect(timeLeft(20 * 60_000, 20)).toEqual({ spent: 20, progress: 1, kind: 'over', minutes: 20 });
    expect(timeLeft(31 * 60_000, 20)).toEqual({ spent: 31, progress: 1, kind: 'over', minutes: 31 });
  });
});
