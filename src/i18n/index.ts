import { en, type Dict } from './en';
import { nl } from './nl';

export type Lang = 'en' | 'nl';
export type Key = keyof Dict;

const dicts: Record<Lang, Dict> = { en, nl };

export const detectLang = (nav: { language?: string } = globalThis.navigator ?? {}): Lang =>
  nav.language?.toLowerCase().startsWith('nl') ? 'nl' : 'en';

export const translate = (lang: Lang, key: Key): string => dicts[lang][key];
