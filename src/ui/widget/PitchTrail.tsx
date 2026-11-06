import { useEffect, useRef } from 'react';
import { centsFromTarget } from '~/music/tuning';
import { subscribeFrames, tuningOf, useTuner } from '~/state/tuner';

const SECONDS = 3;
const RANGE = 50;
const DRAW_MS = 80; // ~12 fps; scoring uses the full-rate frames elsewhere

interface Point {
  t: number;
  c: number | null;
}

export function PitchTrail() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const pts: Point[] = [];
    const off = subscribeFrames((f, smoothed) => {
      const st = useTuner.getState();
      const c = smoothed === null ? null : centsFromTarget(smoothed, st.a4, tuningOf(st)).cents;
      pts.push({ t: f.t, c });
      while (pts.length > 1 && pts[0]!.t < f.t - SECONDS) pts.shift();
    });

    const draw = () => {
      const el = canvas.current;
      const ctx = el?.getContext('2d');
      if (!el || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== w * dpr) el.width = w * dpr;
      if (el.height !== h * dpr) el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const css = getComputedStyle(el);
      ctx.strokeStyle = css.getPropertyValue('--divider');
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      const last = pts[pts.length - 1];
      if (!last) return;
      ctx.strokeStyle = css.getPropertyValue('--accent');
      ctx.lineWidth = 2;
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        if (p.c === null) {
          pen = false;
          continue;
        }
        const x = ((p.t - (last.t - SECONDS)) / SECONDS) * w;
        const y = h / 2 - (Math.max(-RANGE, Math.min(RANGE, p.c)) / RANGE) * (h / 2);
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    };
    const id = setInterval(draw, DRAW_MS);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);

  return <canvas ref={canvas} className="pitch-trail" aria-hidden="true" />;
}
