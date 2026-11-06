import { useState } from 'react';
import { translate, type Key } from '~/i18n';
import { useToneSync } from '~/state/drone';
import { useTuner } from '~/state/tuner';
import { Drone } from '~/ui/pages/Drone';
import { Tuner } from '~/ui/pages/Tuner';
import { TunerWidget } from '~/ui/widget/TunerWidget';

const PAGES = { tuner: Tuner, drone: Drone } as const;
type PageId = keyof typeof PAGES;

export function App() {
  const { lang, setLang } = useTuner();
  const [page, setPage] = useState<PageId>('tuner');
  useToneSync();
  const Page = PAGES[page];
  return (
    <main style={{ padding: 20 }}>
      <h1>{translate(lang, 'appTitle')}</h1>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(Object.keys(PAGES) as PageId[]).map((id) => (
          <button key={id} aria-current={page === id} onClick={() => setPage(id)}>
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
      <Page />
      <TunerWidget />
    </main>
  );
}
