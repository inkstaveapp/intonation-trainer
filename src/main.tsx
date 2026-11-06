import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Tuner } from '~/ui/pages/Tuner';
import '~/ui/tokens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Tuner />
  </StrictMode>,
);
