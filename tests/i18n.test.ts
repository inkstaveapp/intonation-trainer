import { describe, expect, it } from 'vitest';
import { INSTRUMENT_LIST } from '~/music/instruments';
import { en } from '~/i18n/en';
import { nl } from '~/i18n/nl';
import { detectLang, translate } from '~/i18n';

describe('i18n', () => {
  it('nl has exactly the keys of en, all non-empty', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
    for (const v of Object.values(nl)) expect(v.length).toBeGreaterThan(0);
  });
  it('every instrument preset has a name in every language', () => {
    for (const p of INSTRUMENT_LIST) {
      expect(en).toHaveProperty([`instrument.${p.id}`]);
      expect(nl).toHaveProperty([`instrument.${p.id}`]);
    }
  });
  it('detects Dutch, falls back to English', () => {
    expect(detectLang({ language: 'nl-NL' })).toBe('nl');
    expect(detectLang({ language: 'fr' })).toBe('en');
    expect(translate('nl', 'appTitle')).toBe('Intonatietrainer');
  });
});
