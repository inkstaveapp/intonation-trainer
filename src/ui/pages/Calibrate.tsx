import { translate, type Key, type Lang } from '~/i18n';
import { getInstrument, soundingToWritten } from '~/music/instruments';
import { noteName } from '~/music/notes';
import { freqToMidi } from '~/music/pitch';
import { CALIBRATION_FRAMES, useCalibration } from '~/state/calibration';
import { useTuner } from '~/state/tuner';

/** Written note name (as the player reads it) for a sounding frequency. */
const writtenName = (hz: number, a4: number, instrument: string) =>
  noteName(soundingToWritten(Math.round(freqToMidi(hz, a4)), getInstrument(instrument)));

export function Calibrate() {
  const { lang, range, instrument, a4, reading } = useTuner();
  const cal = useCalibration();
  const t = (k: Key) => translate(lang as Lang, k);
  const saved = range && range.instrument === instrument ? range : null;
  const name = (hz: number) => writtenName(hz, a4, instrument);

  return (
    <section style={{ marginTop: 16, maxWidth: 560 }}>
      <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>{t('calibrate.title')}</h2>
      {cal.step === 'idle' ? (
        <>
          <p style={{ margin: '0 0 8px' }}>{t('calibrate.hint')}</p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>
              {saved ? `${name(saved.lowHz)} – ${name(saved.highHz)}` : t('calibrate.auto')}
            </strong>
          </p>
          <button onClick={() => void cal.begin()}>
            {saved ? t('calibrate.redo') : t('calibrate.start')}
          </button>{' '}
          {saved && (
            <button onClick={() => useTuner.getState().setRange(null)}>
              {t('calibrate.reset')}
            </button>
          )}
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px' }} role="status">
            {cal.low !== null && (
              <>
                {t('calibrate.lowest')} <strong>{name(cal.low)}</strong>.{' '}
              </>
            )}
            {cal.resting && cal.step === 'high'
              ? t('calibrate.rest')
              : t(cal.step === 'low' ? 'calibrate.playLow' : 'calibrate.playHigh')}
          </p>
          {cal.error && <p role="alert">{t('calibrate.badOrder')}</p>}
          <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 600 }}>
            {!cal.resting && reading ? noteName(reading.writtenMidi) : '–'}
          </p>
          <progress
            max={CALIBRATION_FRAMES}
            value={cal.resting ? 0 : cal.progress}
            aria-label={t('calibrate.hold')}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
          <p style={{ margin: '8px 0 0' }}>
            <button onClick={cal.cancel}>{t('calibrate.cancel')}</button>
          </p>
        </>
      )}
    </section>
  );
}
