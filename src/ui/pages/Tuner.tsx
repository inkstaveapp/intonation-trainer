import { INSTRUMENTS, type InstrumentId } from '../../music/instruments';
import { noteName } from '../../music/notes';
import { translate, type Key } from '../../i18n';
import { useTuner } from '../../state/tuner';

export function Tuner() {
  const s = useTuner();
  const t = (k: Key) => translate(s.lang, k);
  const listening = s.status === 'listening';
  return (
    <main style={{ padding: 20, maxWidth: 360 }}>
      <h1>{t('appTitle')}</h1>
      <select
        aria-label={t('language')}
        value={s.lang}
        onChange={(e) => s.setLang(e.target.value as 'en' | 'nl')}
      >
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
      </select>{' '}
      <select
        aria-label="instrument"
        value={s.instrument}
        onChange={(e) => s.setInstrument(e.target.value as InstrumentId)}
      >
        {Object.keys(INSTRUMENTS).map((id) => (
          <option key={id} value={id}>
            {t(`instrument.${id}` as Key)}
          </option>
        ))}
      </select>
      <p style={{ fontSize: 56, fontWeight: 600, margin: '16px 0 0' }}>
        {s.reading ? noteName(s.reading.writtenMidi) : '–'}
      </p>
      <p style={{ fontSize: 22, margin: 0 }}>
        {s.reading ? `${s.reading.cents > 0 ? '+' : ''}${s.reading.cents.toFixed(0)} ¢` : ' '}
      </p>
      <button onClick={() => void (listening ? s.stop() : s.start())}>
        {listening ? t('tuner.stop') : s.status === 'paused' ? t('tuner.paused') : t('tuner.start')}
      </button>
      {s.warnings.includes('clipping') && <p role="alert">{t('tuner.tooLoud')}</p>}
      {s.warnings.includes('highLatency') && <p role="alert">{t('tuner.highLatency')}</p>}
    </main>
  );
}
