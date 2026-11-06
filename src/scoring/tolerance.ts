export interface Tolerance {
  /** Within this many cents: full marks, teal dot. */
  good: number;
  /** Within this many cents: amber dot. Beyond: coral. */
  warn: number;
  /** At or beyond this many cents a note scores zero. */
  zero: number;
}

export const DEFAULT_TOLERANCE: Tolerance = { good: 5, warn: 15, zero: 30 };

export type CentsState = 'good' | 'warn' | 'bad';

/** Shared by the widget colours and (later) the scoring so they always agree. */
export const centsState = (cents: number, tol: Tolerance): CentsState => {
  const a = Math.abs(cents);
  return a <= tol.good ? 'good' : a <= tol.warn ? 'warn' : 'bad';
};
