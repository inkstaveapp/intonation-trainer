import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { translate, type Key } from '~/i18n';
import { useToneSync } from '~/state/drone';
import { usePopOut } from '~/state/popout';
import { useSession } from '~/state/session';
import { applyTheme, THEMES, useTheme, type Theme } from '~/state/theme';
import { useTuner } from '~/state/tuner';
import { DebugPanel, debugEnabled } from '~/ui/DebugPanel';
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
  const popOut = usePopOut((s) => s.win);
  const { theme, setTheme } = useTheme();
  useToneSync();
  useEffect(() => {
    const apply = () => {
      applyTheme(document, theme);
      if (popOut) applyTheme(popOut.document, theme);
    };
    apply();
    const dark = matchMedia('(prefers-color-scheme: dark)');
    dark.addEventListener('change', apply); // "system" follows the OS while the app is open
    return () => dark.removeEventListener('change', apply);
  }, [theme, popOut]);
  const inlineTuner = page === 'tuner' && !reportId && !popOut; // the tuner page IS the tuner, so no floating copy
  useEffect(() => {
    if (last) setReportId(last.id); // show the report as soon as a recording stops
  }, [last]);
  return (
    <main style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <header className="app-header">
        <img className="logo" src="/icon.svg" alt="" />
        <h1>{translate(lang, 'appTitle')}</h1>
      </header>
      <nav className="app-nav">
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
        <span className="spacer" />
        <select
          aria-label={translate(lang, 'theme.label')}
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          {THEMES.map((th) => (
            <option key={th} value={th}>
              {translate(lang, `theme.${th}` as Key)}
            </option>
          ))}
        </select>
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
      {popOut
        ? createPortal(<TunerWidget mode="pip" />, popOut.document.body)
        : !inlineTuner && <TunerWidget />}
      {debugEnabled() && <DebugPanel />}
    </main>
  );
}
