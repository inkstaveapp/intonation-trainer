import { translate, type Key, type Lang } from '~/i18n';
import type { InstrumentId } from '~/music/instruments';

/** Display name of an instrument pitch, with the instruments that use it. */
export const pitchLabel = (lang: Lang, id: InstrumentId): string =>
  translate(lang, `pitch.${id}` as Key);
