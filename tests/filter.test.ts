import { describe, expect, it } from 'vitest';
import { FrameFilter } from '~/audio/filter';

describe('FrameFilter', () => {
  it('rejects weak frames and clears history', () => {
    const f = new FrameFilter();
    expect(f.push(440, 0.5, 0.1)).toBeNull();
    expect(f.push(440, 0.95, 0.001)).toBeNull();
    expect(f.push(0, 0.95, 0.1)).toBeNull();
  });
  it('median-filters out a single outlier', () => {
    const f = new FrameFilter();
    f.push(440, 0.95, 0.1);
    f.push(441, 0.95, 0.1);
    expect(f.push(880, 0.95, 0.1)).toBe(441);
  });
});
