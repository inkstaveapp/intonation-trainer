import { translate, type Key } from '~/i18n';
import { noteName, pitchClassName } from '~/music/notes';
import { targetOffsetCents } from '~/music/tuning';
import { useDrone } from '~/state/drone';
import { tuningOf, useTuner } from '~/state/tuner';

const PITCH_CLASSES = Array.from({ length: 12 }, (_, i) => i);
const OCTAVES = [2, 3, 4, 5, 6];

export function Drone() {
  const s = useTuner();
  const d = useDrone();
  const t = (k: Key) => translate(s.lang, k);
  const pc = s.droneWritten % 12;
  const octave = Math.floor(s.droneWritten / 12) - 1;
  const offset =
    s.reading && s.tuningKind === 'just'
      ? targetOffsetCents(s.reading.soundingMidi, tuningOf(s))
      : null;

  return (
    <section style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <p>{t('drone.hint')}</p>
      <label>
        {t('drone.tonic')}{' '}
        <select
          value={pc}
          onChange={(e) => s.setDroneWritten((octave + 1) * 12 + Number(e.target.value))}
        >
          {PITCH_CLASSES.map((i) => (
            <option key={i} value={i}>
              {pitchClassName(i)}
            </option>
          ))}
        </select>{' '}
        <select
          aria-label={t('drone.octave')}
          value={octave}
          onChange={(e) => s.setDroneWritten((Number(e.target.value) + 1) * 12 + pc)}
        >
          {OCTAVES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{t('drone.tuning')}</legend>
        {(['equal', 'just'] as const).map((k) => (
          <label key={k} style={{ marginRight: 16 }}>
            <input
              type="radio"
              name="tuning"
              checked={s.tuningKind === k}
              onChange={() => s.setTuningKind(k)}
            />{' '}
            {t(`drone.${k}` as Key)}
          </label>
        ))}
      </fieldset>
      <label>
        {t('drone.volume')}{' '}
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={d.volume}
          onChange={(e) => d.setVolume(Number(e.target.value))}
        />
      </label>
      <div>
        <button onClick={() => void d.toggleDrone()}>
          {d.playing ? t('drone.stop') : `${t('drone.play')} ${noteName(s.droneWritten)}`}
        </button>{' '}
        <button onClick={() => void d.toggleReference()}>
          {d.refPlaying ? t('drone.refStop') : `${t('drone.refPlay')} ${s.a4} Hz`}
        </button>
      </div>
      {offset !== null && (
        <p>
          {t('drone.offset')} {offset > 0 ? '+' : ''}
          {offset.toFixed(1)} ¢
        </p>
      )}
      {d.playing && d.headphones === 'none' && <p role="alert">{t('drone.noHeadphones')}</p>}
    </section>
  );
}
