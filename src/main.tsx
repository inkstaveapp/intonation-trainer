import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initPersistence } from '~/state/persist';
import { App } from '~/ui/App';
import '~/ui/tokens.css';

// Saved settings load before the first render so the UI does not flash defaults.
void initPersistence().finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
