import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { translate, type Key } from '~/i18n';
import { INSTRUMENT_LIST } from '~/music/instruments';
import { noteName } from '~/music/notes';
import { useMetronome } from '~/state/metronome';
import { usePopOut } from '~/state/popout';
import { useSession } from '~/state/session';
import { useTuner } from '~/state/tuner';
import { useWidget, type Corner } from '~/state/widget';
import { pitchLabel } from '~/ui/labels';
import { CentsBar } from './CentsBar';
import { MetronomePanel } from './MetronomePanel';
import { PitchTrail } from './PitchTrail';
import './widget.css';

const A_CHOICES = [440, 442, 443];

const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Elapsed recording time as m:ss; UI only, so a coarse timer is fine. */
function useElapsed(recording: boolean, startedMs: number): string {
  const [, force] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [recording]);
  return mmss(recording ? Date.now() - startedMs : 0);
}

export type WidgetMode = 'floating' | 'pip' | 'page';

export function TunerWidget({ mode = 'floating' }: { mode?: WidgetMode }) {
  const floating = mode === 'floating';
  const page = mode === 'page';
  const s = useTuner();
  const w = useWidget();
  const m = useMetronome();
  const rec = useSession();
  const po = usePopOut();
  const elapsed = useElapsed(rec.recording, rec.startedMs);
  const t = (k: Key) => translate(s.lang, k);
  const root = useRef<HTMLElement>(null);
  const grab = useRef({ dx: 0, dy: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const collapsed = w.collapsed && !page; // the full-page tuner is always expanded
  const listening = s.status === 'listening';
  const cents = s.reading?.cents ?? null;
  const note = s.reading ? noteName(s.reading.writtenMidi) : '–';
  const centsText = cents === null ? '' : `${cents > 0 ? '+' : ''}${cents.toFixed(0)} ¢`;
  const nextA = A_CHOICES[(A_CHOICES.indexOf(s.a4) + 1) % A_CHOICES.length]!;

  const down = (e: PointerEvent) => {
    if (!floating || (e.target as HTMLElement).closest('button,select,input') || !root.current)
      return;
    const r = root.current.getBoundingClientRect();
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: r.left, y: r.top });
  };
  const move = (e: PointerEvent) =>
    drag && setDrag({ x: e.clientX - grab.current.dx, y: e.clientY - grab.current.dy });
  const up = () => {
    if (!drag || !root.current) return;
    const r = root.current.getBoundingClientRect();
    const v = r.top + r.height / 2 < window.innerHeight / 2 ? 't' : 'b';
    const h = r.left + r.width / 2 < window.innerWidth / 2 ? 'l' : 'r';
    w.setCorner((v + h) as Corner);
    setDrag(null);
  };

  const micButton = (
    <button
      className="tw-btn"
      aria-label={listening ? t('tuner.stop') : t('tuner.start')}
      onClick={() => void (listening ? s.stop() : s.start())}
    >
      {listening ? '■' : '▶'}
    </button>
  );
  const collapseButton = (
    <button
      className="tw-btn"
      aria-label={collapsed ? t('widget.expand') : t('widget.collapse')}
      onClick={w.toggleCollapsed}
    >
      {collapsed ? '▴' : '▾'}
    </button>
  );

  return (
    <section
      ref={root}
      className="tw"
      data-collapsed={collapsed}
      data-corner={floating ? (drag ? 'drag' : w.corner) : mode}
      data-size={w.size}
      data-dragging={drag !== null}
      style={{
        opacity: w.opacity,
        ...(drag ? { left: drag.x, top: drag.y, right: 'auto', bottom: 'auto' } : {}),
      }}
      aria-label={t('appTitle')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {m.running && m.mode === 'flash' && (
        <span key={m.tick} className="tw-flash" data-accent={m.beat === 0} />
      )}
      {collapsed ? (
        <div className="tw-pill">
          <span className="tw-note-sm">{note}</span>
          <CentsBar cents={cents} tolerance={s.tolerance} label={t('widget.cents')} />
          {micButton}
          {collapseButton}
        </div>
      ) : (
        <div className="tw-card">
          <div className="tw-row">
            <select
              className="tw-chip"
              aria-label={t('instrument')}
              value={s.instrument}
              onChange={(e) => s.setInstrument(e.target.value)}
            >
              {INSTRUMENT_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {pitchLabel(s.lang, p.id)}
                </option>
              ))}
            </select>
            <button
              className="tw-chip"
              aria-label={`${t('widget.tuningA')} ${s.a4} Hz`}
              onClick={() => s.setA4(nextA)}
            >
              A {s.a4}
            </button>
            <button
              className="tw-btn"
              aria-label={po.win ? t('pip.close') : t('pip.open')}
              onClick={() => void po.toggle()}
            >
              ⧉
            </button>
            {!page && collapseButton}
          </div>
          {po.blocked && <p role="alert">{t('pip.blocked')}</p>}
          {s.error && <p role="alert">{t(`tuner.err.${s.error}` as Key)}</p>}
          <div className="tw-main">
            <div className="tw-note" aria-live="off">
              {note}
            </div>
            <div className="tw-cents">{centsText || ' '}</div>
            <CentsBar cents={cents} tolerance={s.tolerance} label={t('widget.cents')} />
            <PitchTrail />
            {s.warnings.includes('clipping') && <p role="alert">{t('tuner.tooLoud')}</p>}
            {s.warnings.includes('highLatency') && <p role="alert">{t('tuner.highLatency')}</p>}
          </div>
          <MetronomePanel />
          <div className="tw-row tw-foot">
            <button
              className="tw-chip"
              aria-label={listening ? t('tuner.stop') : t('tuner.start')}
              onClick={() => void (listening ? s.stop() : s.start())}
            >
              {listening ? `■ ${t('tuner.stop')}` : `▶ ${t('tuner.listen')}`}
            </button>
            <button
              className="tw-chip tw-rec"
              data-recording={rec.recording}
              aria-label={rec.recording ? t('rec.stop') : t('rec.start')}
              onClick={() => void rec.toggle()}
            >
              <span className="tw-rec-dot" aria-hidden="true" />
              {rec.recording ? elapsed : t('rec.label')}
            </button>
            {floating && (
              <>
                <button className="tw-chip" aria-label={t('widget.size')} onClick={w.cycleSize}>
                  {w.size.toUpperCase()}
                </button>
                <input
                  type="range"
                  min={60}
                  max={100}
                  value={Math.round(w.opacity * 100)}
                  aria-label={t('widget.opacity')}
                  onChange={(e) => w.setOpacity(Number(e.target.value) / 100)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
