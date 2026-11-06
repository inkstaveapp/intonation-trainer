import { describe, expect, it } from 'vitest';
import { centsState, DEFAULT_TOLERANCE as T } from '~/scoring/tolerance';

describe('centsState', () => {
  it('classifies by absolute deviation with inclusive bounds', () => {
    expect(centsState(0, T)).toBe('good');
    expect(centsState(-5, T)).toBe('good');
    expect(centsState(5.1, T)).toBe('warn');
    expect(centsState(-15, T)).toBe('warn');
    expect(centsState(15.1, T)).toBe('bad');
  });
});
