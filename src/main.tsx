import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from '~/pwa';
import { initPersistence } from '~/state/persist';
import { App } from '~/ui/App';
import '~/ui/tokens.css';
import '~/ui/app.css';

// Saved settings load before the first render so the UI does not flash defaults, but never block the
// app on storage: a hung IndexedDB (blocked or private mode) would otherwise leave a blank page.
const SETTINGS_WAIT_MS = 1500;
void Promise.race([
  initPersistence(),
  new Promise((resolve) => setTimeout(resolve, SETTINGS_WAIT_MS)),
]).finally(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);

registerServiceWorker();
