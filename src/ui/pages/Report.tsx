import { useEffect, useState } from 'react';
import { downloadText } from '~/export/download';
import { exportFileName, notesToCsv } from '~/export/csv';
import { translate, type Key, type Lang } from '~/i18n';
import { noteName } from '~/music/notes';
import { worstNotes } from '~/scoring/score';
import { getSessionRecord, type SessionRecord } from '~/storage/db';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';
import { NoteChart } from '~/ui/charts/NoteChart';
import { TendencyMap } from '~/ui/charts/TendencyMap';
import './report.css';

export const formatDate = (ms: number, lang: Lang) =>
  new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);

const signed = (c: number) => `${c > 0 ? '+' : ''}${c.toFixed(0)} ¢`;

export function ReportPage({ id, onBack }: { id: string; onBack: () => void }) {
  const lang = useTuner((s) => s.lang);
  const last = useSession((s) => s.last);
  const [loaded, setLoaded] = useState<SessionRecord | null | undefined>(undefined);
  const t = (k: Key) => translate(lang, k);

  useEffect(() => {
    if (last?.id === id) return;
    let live = true;
    getSessionRecord(id)
      .then((r) => live && setLoaded(r ?? null))
      .catch(() => live && setLoaded(null));
    return () => {
      live = false;
    };
  }, [id, last]);

  const s: SessionRecord | null | undefined = last?.id === id ? last : loaded;
  const back = <button onClick={onBack}>{t('report.back')}</button>;
  if (s === undefined) return back;
  if (s === null)
    return (
      <>
        {back}
        <p>{t('report.missing')}</p>
      </>
    );

  const { summary: m, weights: w } = s;
  const pct = (x: number) => Math.round((100 * x) / (w.accuracy + w.stability));
  return (
    <article className="report">
      {back}{' '}
      {m.noteCount > 0 && (
        <button onClick={() => downloadText(exportFileName('session', s.startedAt), notesToCsv(s))}>
          {t('export.csv')}
        </button>
      )}
      <h2>{t('report.title')}</h2>
      <p className="report-meta">
        {formatDate(s.startedAt, lang)} · {t(`instrument.${s.instrument}` as Key)} · A {s.a4} ·{' '}
        {t(`drone.${s.tuningKind}` as Key)}
      </p>
      {m.noteCount === 0 ? (
        <p>{t('report.empty')}</p>
      ) : (
        <>
          <div className="report-score" aria-label={t('report.score')}>
            {m.combined}
          </div>
          <p className="report-weights">
            {t('report.weights')} {pct(w.accuracy)}% {t('report.accuracy').toLowerCase()} /{' '}
            {pct(w.stability)}% {t('report.stability').toLowerCase()}
          </p>
          <dl className="report-stats">
            <dt>{t('report.accuracy')}</dt>
            <dd>{m.accuracy}</dd>
            <dt>{t('report.stability')}</dt>
            <dd>{m.stability}</dd>
            <dt>{t('report.inTolerance')}</dt>
            <dd>
              {m.pctInTolerance}% (±{s.tolerance.good} ¢)
            </dd>
            <dt>{t('report.meanDev')}</dt>
            <dd>{m.meanAbsDev.toFixed(1)} ¢</dd>
          </dl>
          <h3>{t('report.notesChart')}</h3>
          <NoteChart notes={s.notes} tolerance={s.tolerance} label={t('report.notesChart')} />
          <h3>{t('report.worst')}</h3>
          <ol>
            {worstNotes(s.notes, 5).map((n, i) => (
              <li key={i}>
                {noteName(n.writtenMidi)}: {signed(n.cents)} ({t('report.score')} {n.score})
                {n.vibratoWidth !== null &&
                  ` · ${t('report.vibrato')} ${n.vibratoWidth.toFixed(0)} ¢`}
              </li>
            ))}
          </ol>
          <h3>{t('report.tendency')}</h3>
          <p className="report-meta">{t('report.tendencyHint')}</p>
          <TendencyMap bias={m.bias} tolerance={s.tolerance} />
        </>
      )}
    </article>
  );
}
