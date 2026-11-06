import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BPM_MAX, BPM_MIN } from '~/audio/scheduler';
import { translate, type Key } from '~/i18n';
import { useMetronome } from '~/state/metronome';
import { useTuner } from '~/state/tuner';

const FIRST_REPEAT_MS = 400;
const REPEAT_MS = 80;
const FAST_AFTER = 12; // repeats before the step grows from 1 to 5 BPM

/** Tempo: type it, hold -/+ to repeat (it speeds up), or drag the slider. */
export function TempoControl() {
  const lang = useTuner((s) => s.lang);
  const bpm = useMetronome((s) => s.bpm);
  const setBpm = useMetronome((s) => s.setBpm);
  const t = (k: Key) => translate(lang, k);
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const adjust = (delta: number) => setBpm(useMetronome.getState().bpm + delta);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);
  const hold = (dir: 1 | -1) => {
    let repeats = 0;
    const tick = () => {
      repeats++;
      adjust(dir * (repeats > FAST_AFTER ? 5 : 1));
      timer.current = setTimeout(tick, REPEAT_MS);
    };
    adjust(dir);
    timer.current = setTimeout(tick, FIRST_REPEAT_MS);
  };
  const holdProps = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent) => e.button === 0 && hold(dir),
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // no long-press menu on touch
    // Pointer presses are handled above; a click with no pointer (detail 0) is the keyboard.
    onClick: (e: React.MouseEvent) => e.detail === 0 && adjust(dir),
  });

  const commit = () => {
    const n = parseInt(draft ?? '', 10);
    if (!Number.isNaN(n)) setBpm(n);
    setDraft(null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setDraft(null);
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      adjust(e.key === 'ArrowUp' ? step : -step);
      setDraft(null);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      adjust(e.key === 'PageUp' ? 10 : -10);
      setDraft(null);
    }
  };

  return (
    <>
      <div className="tw-row">
        <button className="tw-btn" aria-label={t('metro.bpmDown')} {...holdProps(-1)}>
          −
        </button>
        <label className="tw-bpm-box">
          <input
            className="tw-bpm"
            type="text"
            inputMode="numeric"
            aria-label={t('metro.bpm')}
            value={draft ?? String(bpm)}
            onFocus={(e) => {
              setDraft(String(bpm));
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={commit}
            onKeyDown={onKey}
          />
          <span className="tw-bpm-unit">BPM</span>
        </label>
        <button className="tw-btn" aria-label={t('metro.bpmUp')} {...holdProps(1)}>
          +
        </button>
      </div>
      <input
        className="tw-tempo"
        type="range"
        min={BPM_MIN}
        max={BPM_MAX}
        value={bpm}
        aria-label={t('metro.bpm')}
        onChange={(e) => setBpm(Number(e.target.value))}
      />
    </>
  );
}
