import { centsState, type Tolerance } from '~/scoring/tolerance';

const RANGE = 50; // bar spans ±50 cents

export function CentsBar({
  cents,
  tolerance,
  label,
}: {
  cents: number | null;
  tolerance: Tolerance;
  label: string;
}) {
  const pos = cents === null ? 50 : 50 + (Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE) * 50;
  return (
    <div
      className="cents-bar"
      role="meter"
      aria-label={label}
      aria-valuemin={-RANGE}
      aria-valuemax={RANGE}
      aria-valuenow={cents === null ? 0 : Math.round(cents)}
    >
      <span className="cents-tick" />
      {cents !== null && (
        <span
          className="cents-dot"
          data-state={centsState(cents, tolerance)}
          style={{ left: `${pos}%` }}
        />
      )}
    </div>
  );
}
