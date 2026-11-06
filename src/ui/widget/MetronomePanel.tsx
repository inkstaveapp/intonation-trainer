import { translate, type Key } from '~/i18n';
import { SIG_IDS, SIGNATURES, useMetronome, type ClickMode, type SigId } from '~/state/metronome';
import { useTuner } from '~/state/tuner';
import { TempoControl } from './TempoControl';

const MODES: ClickMode[] = ['sound', 'flash', 'haptic'];

export function MetronomePanel() {
  const lang = useTuner((s) => s.lang);
  const m = useMetronome();
  const t = (k: Key) => translate(lang, k);
  return (
    <div className="tw-metro">
      <TempoControl />
      <div className="tw-row">
        <button
          className="tw-chip tw-play"
          data-running={m.running}
          aria-label={m.running ? t('metro.stop') : t('metro.play')}
          onClick={() => void m.toggle()}
        >
          {m.running ? `■ ${t('metro.stopShort')}` : `▶ ${t('metro.playShort')}`}
        </button>
        <button className="tw-chip" aria-label={t('metro.tap')} onClick={m.tap}>
          {t('metro.tapShort')}
        </button>
      </div>
      <div className="tw-row">
        <select
          className="tw-chip"
          aria-label={t('metro.sig')}
          value={m.sig}
          onChange={(e) => m.setSig(e.target.value as SigId)}
        >
          {SIG_IDS.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
        <select
          className="tw-chip"
          aria-label={t('metro.mode')}
          value={m.mode}
          onChange={(e) => m.setMode(e.target.value as ClickMode)}
        >
          {MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`metro.mode.${mode}` as Key)}
            </option>
          ))}
        </select>
      </div>
      <div className="beat-dots" aria-hidden="true">
        {Array.from({ length: SIGNATURES[m.sig] }, (_, i) => (
          <span key={i} data-active={m.beat === i} data-accent={i === 0} />
        ))}
      </div>
      {m.running && m.mode === 'sound' && m.headphones === 'none' && (
        <p role="alert">{t('metro.noHeadphones')}</p>
      )}
    </div>
  );
}
