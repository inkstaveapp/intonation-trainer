import { INSTRUMENTS } from '~/music/instruments';
import { clampA4 } from '~/music/pitch';
import { loadSettings, saveSettings, type Settings } from '~/storage/db';
import { SIGNATURES, useMetronome, type SigId } from '~/state/metronome';
import { useDrone } from '~/state/drone';
import { THEMES, useTheme } from '~/state/theme';
import { useTuner } from '~/state/tuner';
import { useWidget } from '~/state/widget';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined;
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  allowed.find((a) => a === v);

/** Stored data is untrusted input (old versions, manual edits): keep only well-formed values. */
export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!isObj(raw)) return {};
  const w = isObj(raw.widget) ? raw.widget : {};
  const m = isObj(raw.metronome) ? raw.metronome : {};
  const t = isObj(raw.tolerance) ? raw.tolerance : {};
  const good = num(t.good, 0.5, 50);
  const warn = num(t.warn, 1, 100);
  const zero = num(t.zero, 2, 200);
  const out: Partial<Settings> = {};
  const lang = oneOf(raw.lang, ['en', 'nl'] as const);
  if (lang) out.lang = lang;
  const theme = oneOf(raw.theme, THEMES);
  if (theme) out.theme = theme;
  if (typeof raw.instrument === 'string' && INSTRUMENTS[raw.instrument])
    out.instrument = raw.instrument;
  const a4 = num(raw.a4, 415, 466);
  if (a4 !== undefined) out.a4 = clampA4(a4);
  const tk = oneOf(raw.tuningKind, ['equal', 'just'] as const);
  if (tk) out.tuningKind = tk;
  const dw = num(raw.droneWritten, 24, 108);
  if (dw !== undefined) out.droneWritten = Math.round(dw);
  if (good !== undefined && warn !== undefined && zero !== undefined && good < warn && warn < zero)
    out.tolerance = { good, warn, zero };
  const dv = num(raw.droneVolume, 0, 0.6);
  if (dv !== undefined) out.droneVolume = dv;
  const corner = oneOf(w.corner, ['tl', 'tr', 'bl', 'br'] as const);
  const size = oneOf(w.size, ['s', 'm', 'l'] as const);
  const opacity = num(w.opacity, 0.6, 1);
  if (corner && size && opacity !== undefined)
    out.widget = { collapsed: w.collapsed === true, corner, size, opacity };
  const bpm = num(m.bpm, 30, 250);
  const sig = oneOf(m.sig, Object.keys(SIGNATURES));
  const mode = oneOf(m.mode, ['sound', 'flash', 'haptic'] as const);
  if (bpm !== undefined && sig && mode) out.metronome = { bpm: Math.round(bpm), sig, mode };
  return out;
}

const collect = (): Settings => {
  const t = useTuner.getState();
  const w = useWidget.getState();
  const m = useMetronome.getState();
  return {
    lang: t.lang,
    theme: useTheme.getState().theme,
    instrument: t.instrument,
    a4: t.a4,
    tuningKind: t.tuningKind,
    droneWritten: t.droneWritten,
    tolerance: t.tolerance,
    droneVolume: useDrone.getState().volume,
    widget: { collapsed: w.collapsed, corner: w.corner, size: w.size, opacity: w.opacity },
    metronome: { bpm: m.bpm, sig: m.sig, mode: m.mode },
  };
};

function apply(s: Partial<Settings>): void {
  useTuner.setState({
    ...(s.lang && { lang: s.lang }),
    ...(s.instrument && { instrument: s.instrument }),
    ...(s.a4 !== undefined && { a4: s.a4 }),
    ...(s.tuningKind && { tuningKind: s.tuningKind }),
    ...(s.droneWritten !== undefined && { droneWritten: s.droneWritten }),
    ...(s.tolerance && { tolerance: s.tolerance }),
  });
  if (s.theme) useTheme.setState({ theme: s.theme });
  if (s.droneVolume !== undefined) useDrone.setState({ volume: s.droneVolume });
  if (s.widget) useWidget.setState(s.widget);
  if (s.metronome) useMetronome.setState({ ...s.metronome, sig: s.metronome.sig as SigId });
}

/** Loads saved settings into the stores, then saves on change. Storage failures never block the app. */
export async function initPersistence(): Promise<void> {
  try {
    apply(sanitizeSettings(await loadSettings()));
  } catch {
    // private mode or blocked storage: run with defaults
  }
  let saved = JSON.stringify(collect());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const now = collect();
      const json = JSON.stringify(now);
      if (json === saved) return; // the tuner store ticks constantly; only write real changes
      saved = json;
      void saveSettings(now).catch(() => undefined);
    }, 300);
  };
  for (const store of [useTuner, useWidget, useMetronome, useDrone, useTheme])
    store.subscribe(schedule);
}
