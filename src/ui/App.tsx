import { useEffect, useState } from 'react';
import { translate, type Key } from '~/i18n';
import { useToneSync } from '~/state/drone';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';
import { Drone } from '~/ui/pages/Drone';
import { History } from '~/ui/pages/History';
import { ReportPage } from '~/ui/pages/Report';
import { Tuner } from '~/ui/pages/Tuner';
import { TunerWidget } from '~/ui/widget/TunerWidget';

const PAGES = { tuner: Tuner, drone: Drone } as const;
const NAV = ['tuner', 'drone', 'history'] as const;
type PageId = (typeof NAV)[number];

export function App() {
  const { lang, setLang } = useTuner();
  const [page, setPage] = useState<PageId>('tuner');
  const [reportId, setReportId] = useState<string | null>(null);
  const last = useSession((s) => s.last);
  useToneSync();
  useEffect(() => {
    if (last) setReportId(last.id); // show the report as soon as a recording stops
  }, [last]);
  return (
    <main style={{ padding: 20 }}>
      <h1>{translate(lang, 'appTitle')}</h1>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {NAV.map((id) => (
          <button
            key={id}
            aria-current={page === id && !reportId}
            onClick={() => {
              setPage(id);
              setReportId(null);
            }}
          >
            {translate(lang, `nav.${id}` as Key)}
          </button>
        ))}
        <select
          aria-label={translate(lang, 'language')}
          value={lang}
          onChange={(e) => setLang(e.target.value as 'en' | 'nl')}
        >
          <option value="en">English</option>
          <option value="nl">Nederlands</option>
        </select>
      </nav>
      {reportId ? (
        <ReportPage id={reportId} onBack={() => setReportId(null)} />
      ) : page === 'history' ? (
        <History onOpen={setReportId} />
      ) : (
        (() => {
          const Page = PAGES[page];
          return <Page />;
        })()
      )}
      <TunerWidget />
    </main>
  );
}
