import { translate } from '~/i18n';
import { useTuner } from '~/state/tuner';

export function Tuner() {
  const lang = useTuner((s) => s.lang);
  return <p>{translate(lang, 'tuner.hint')}</p>;
}
