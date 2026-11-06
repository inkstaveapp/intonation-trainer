import { noteName } from '~/music/notes';
import { centsState, type Tolerance } from '~/scoring/tolerance';
import type { NoteResult } from '~/scoring/types';

const W = 560;
const H = 180;
const RANGE = 50;
const mid = H / 2;
const y = (c: number) => mid - (Math.max(-RANGE, Math.min(RANGE, c)) / RANGE) * (mid - 12);

/** Per-note deviation in playing order, with the "good" tolerance band behind the bars. */
export function NoteChart({
  notes,
  tolerance,
  label,
}: {
  notes: NoteResult[];
  tolerance: Tolerance;
  label: string;
}) {
  const slot = W / Math.max(notes.length, 1);
  const bar = Math.min(26, slot * 0.7);
  const every = Math.ceil(notes.length / 20); // keep note labels legible on long sessions
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} role="img" aria-label={label} className="chart">
      <rect
        x={0}
        y={y(tolerance.good)}
        width={W}
        height={y(-tolerance.good) - y(tolerance.good)}
        className="chart-band"
      />
      <line x1={0} x2={W} y1={mid} y2={mid} className="chart-axis" />
      {notes.map((n, i) => {
        const x = slot * i + (slot - bar) / 2;
        const top = Math.min(y(n.cents), mid);
        return (
          <g key={i}>
            <rect
              x={x}
              y={top}
              width={bar}
              height={Math.max(2, Math.abs(y(n.cents) - mid))}
              rx={3}
              className="chart-bar"
              data-state={centsState(n.cents, tolerance)}
            />
            {i % every === 0 && (
              <text x={x + bar / 2} y={H + 14} textAnchor="middle" className="chart-label">
                {noteName(n.writtenMidi)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
