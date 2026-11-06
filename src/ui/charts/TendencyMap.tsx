import { noteName } from '~/music/notes';
import { centsState, type Tolerance } from '~/scoring/tolerance';
import type { SessionSummary } from '~/scoring/types';

const RANGE = 30;

/** Average sharp/flat tendency for each written note played. Text values are always shown, not only colour. */
export function TendencyMap({
  bias,
  tolerance,
}: {
  bias: SessionSummary['bias'];
  tolerance: Tolerance;
}) {
  return (
    <ul className="tendency">
      {bias.map((b) => {
        const pos = 50 + (Math.max(-RANGE, Math.min(RANGE, b.meanCents)) / RANGE) * 50;
        return (
          <li key={b.writtenMidi}>
            <span className="tendency-note">{noteName(b.writtenMidi)}</span>
            <span className="tendency-track" aria-hidden="true">
              <span className="tendency-mid" />
              <span
                className="tendency-dot"
                data-state={centsState(b.meanCents, tolerance)}
                style={{ left: `${pos}%` }}
              />
            </span>
            <span className="tendency-val">
              {b.meanCents > 0 ? '+' : ''}
              {b.meanCents.toFixed(0)} ¢ ({b.count}×)
            </span>
          </li>
        );
      })}
    </ul>
  );
}
