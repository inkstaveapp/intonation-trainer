import { translate } from '~/i18n';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';

export function Tuner() {
  const lang = useTuner((s) => s.lang);
  const last = useSession((s) => s.last);
  return (
    <>
      <p>{translate(lang, 'tuner.hint')}</p>
      {last && (
        <p>
          {translate(lang, 'session.last')} {last.summary.combined} ({last.summary.noteCount}{' '}
          {translate(lang, 'session.notes')})
        </p>
      )}
    </>
  );
}
