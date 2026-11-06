import { describe, expect, it } from 'vitest';
import { BeatScheduler, bpmFromTaps, ClickLog, clampBpm } from '~/audio/scheduler';

const collect = (beats: number, bpm: number) => {
  const out: [number, number][] = [];
  const s = new BeatScheduler((b, t) => out.push([b, t]));
  s.bpm = bpm;
  s.beats = beats;
  return { s, out };
};

describe('BeatScheduler', () => {
  it('schedules only beats inside the look-ahead window', () => {
    const { s, out } = collect(4, 120);
    s.start(0);
    s.tick(0);
    expect(out).toEqual([[0, 0.05]]);
    s.tick(0.3);
    expect(out).toHaveLength(1); // next beat at 0.55 is beyond 0.3 + 0.1
    s.tick(0.5);
    expect(out[1]).toEqual([1, 0.55]);
  });
  it('wraps the bar and keeps exact spacing', () => {
    const { s, out } = collect(3, 60);
    s.start(0);
    s.tick(0, 5);
    expect(out.map(([b]) => b)).toEqual([0, 1, 2, 0, 1]);
    const gaps = out.slice(1).map(([, t], i) => t - out[i]![1]);
    for (const g of gaps) expect(g).toBeCloseTo(1);
  });
  it('a tempo change applies to the following beats', () => {
    const { s, out } = collect(4, 60);
    s.start(0);
    s.tick(0);
    s.bpm = 120;
    s.tick(2, 0.1);
    expect(out[1]![1] - out[0]![1]).toBeCloseTo(1); // beat 0 -> 1 spacing set before change
    expect(out[2]![1] - out[1]![1]).toBeCloseTo(0.5);
  });
});

describe('ClickLog', () => {
  it('mutes within ±30 ms of a click only', () => {
    const c = new ClickLog();
    c.record(1);
    expect(c.isMuted(1.02)).toBe(true);
    expect(c.isMuted(0.975)).toBe(true);
    expect(c.isMuted(1.05)).toBe(false);
  });
});

describe('tempo helpers', () => {
  it('derives bpm from taps and ignores taps before a long pause', () => {
    expect(bpmFromTaps([0])).toBeNull();
    expect(bpmFromTaps([0, 0.5, 1, 1.5])).toBe(120);
    expect(bpmFromTaps([0, 0.5, 5, 5.6, 6.2])).toBe(100);
  });
  it('clamps to 30-250', () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(999)).toBe(250);
    expect(bpmFromTaps([0, 0.1])).toBe(250);
  });
});
