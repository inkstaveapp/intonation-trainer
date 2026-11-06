import { canChooseOutput } from '~/audio/context';
import { translate, type Key } from '~/i18n';
import { useDevices } from '~/state/devices';
import { useTuner } from '~/state/tuner';

/** Choose the microphone and, where the browser allows it, the sound output. */
export function Devices() {
  const lang = useTuner((s) => s.lang);
  const d = useDevices();
  const t = (k: Key) => translate(lang, k);
  const unnamed =
    d.inputs.length > 0 &&
    d.inputs.every((x) => /\s\d+$/.test(x.label) && x.label.startsWith(t('devices.mic')));

  return (
    <section style={{ marginTop: 16, maxWidth: 560, display: 'grid', gap: 8 }}>
      <h2 style={{ fontSize: 18, margin: 0 }}>{t('devices.title')}</h2>
      {d.micAvailable === false && (
        <p role="alert" style={{ margin: 0 }}>
          {t('devices.noMic')}
        </p>
      )}
      <label style={{ display: 'grid', gap: 4 }}>
        {t('devices.mic')}
        <select
          value={d.inputId ?? ''}
          disabled={d.inputs.length === 0}
          onChange={(e) => d.setInput(e.target.value || null)}
        >
          <option value="">{t('devices.default')}</option>
          {d.inputs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      {unnamed && <p style={{ margin: 0, color: 'var(--muted)' }}>{t('devices.noLabels')}</p>}
      {canChooseOutput() ? (
        <label style={{ display: 'grid', gap: 4 }}>
          {t('devices.output')}
          <select
            value={d.outputId ?? ''}
            onChange={(e) => void d.setOutput(e.target.value || null)}
          >
            <option value="">{t('devices.default')}</option>
            {d.outputs.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p style={{ margin: 0, color: 'var(--muted)' }}>{t('devices.outputUnsupported')}</p>
      )}
      {d.outputFailed && (
        <p role="alert" style={{ margin: 0 }}>
          {t('devices.outputFailed')}
        </p>
      )}
    </section>
  );
}
