import { useEffect, useState } from 'react';
import { translate, type Key } from '~/i18n';
import { deleteSession, listSessions, type SessionRecord } from '~/storage/db';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';
import { formatDate } from './Report';

export function History({ onOpen }: { onOpen: (id: string) => void }) {
  const lang = useTuner((s) => s.lang);
  const last = useSession((s) => s.last); // a new recording refreshes the list
  const [rows, setRows] = useState<SessionRecord[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const t = (k: Key) => translate(lang, k);

  useEffect(() => {
    let live = true;
    listSessions()
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [last]);

  if (rows === null) return null;
  if (rows.length === 0) return <p>{t('history.empty')}</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8, maxWidth: 480 }}>
      {rows.map((r) => (
        <li key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ flex: 1, textAlign: 'left' }} onClick={() => onOpen(r.id)}>
            {formatDate(r.startedAt, lang)} · {t(`instrument.${r.instrument}` as Key)} ·{' '}
            {t('report.score')} {r.summary.combined} ({r.summary.noteCount} {t('session.notes')})
          </button>
          {confirming === r.id ? (
            <>
              <button
                onClick={() =>
                  void deleteSession(r.id)
                    .then(() => setRows(rows.filter((x) => x.id !== r.id)))
                    .finally(() => setConfirming(null))
                }
              >
                {t('history.yes')}
              </button>
              <button onClick={() => setConfirming(null)}>{t('history.no')}</button>
            </>
          ) : (
            <button aria-label={t('history.delete')} onClick={() => setConfirming(r.id)}>
              ✕
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
