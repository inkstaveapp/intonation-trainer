import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { nl } from '../src/i18n/nl';
import { detectLang, translate } from '../src/i18n';

describe('i18n', () => {
  it('nl has exactly the keys of en, all non-empty', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
    for (const v of Object.values(nl)) expect(v.length).toBeGreaterThan(0);
  });
  it('detects Dutch, falls back to English', () => {
    expect(detectLang({ language: 'nl-NL' })).toBe('nl');
    expect(detectLang({ language: 'fr' })).toBe('en');
    expect(translate('nl', 'appTitle')).toBe('Intonatietrainer');
  });
});
