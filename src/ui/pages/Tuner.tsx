import { translate } from '~/i18n';
import { useTuner } from '~/state/tuner';
import { TunerWidget } from '~/ui/widget/TunerWidget';

export function Tuner() {
  const { lang, setLang } = useTuner();
  return (
    <main style={{ padding: 20 }}>
      <h1>{translate(lang, 'appTitle')}</h1>
      <select
        aria-label={translate(lang, 'language')}
        value={lang}
        onChange={(e) => setLang(e.target.value as 'en' | 'nl')}
      >
        <option value="en">English</option>
        <option value="nl">Nederlands</option>
      </select>
      <TunerWidget />
    </main>
  );
}
