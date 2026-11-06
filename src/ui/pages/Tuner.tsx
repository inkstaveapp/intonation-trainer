import { translate } from '~/i18n';
import { usePopOut } from '~/state/popout';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';
import { TunerWidget } from '~/ui/widget/TunerWidget';

/** The tuner as a full page. The floating widget takes over on the other pages. */
export function Tuner() {
  const lang = useTuner((s) => s.lang);
  const last = useSession((s) => s.last);
  const popOut = usePopOut();
  return (
    <>
      {popOut.win ? (
        <p>
          {translate(lang, 'pip.active')}{' '}
          <button onClick={() => void popOut.toggle()}>{translate(lang, 'pip.close')}</button>
        </p>
      ) : (
        <TunerWidget mode="page" />
      )}
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
