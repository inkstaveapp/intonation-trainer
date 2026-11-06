import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { detectLang, translate } from './i18n';
import './ui/tokens.css';

const lang = detectLang();
document.documentElement.lang = lang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>{translate(lang, 'appTitle')}</h1>
  </StrictMode>,
);
