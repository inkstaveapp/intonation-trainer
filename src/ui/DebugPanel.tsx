import { useEffect, useState } from 'react';
import { peekAudioContext } from '~/audio/context';
import { subscribeFrames } from '~/state/tuner';

/** Add ?debug to the URL to show this. Measures what matters for phones: detector cost against the audio-block budget. */
export const debugEnabled = (): boolean => new URLSearchParams(location.search).has('debug');

export function DebugPanel() {
  const [text, setText] = useState('start listening to measure');

  useEffect(() => {
    let frames = 0;
    let cost = 0;
    let since = performance.now();
    const off = subscribeFrames((f) => {
      frames++;
      if (f.costMs) cost = f.costMs;
    });
    // UI refresh only; the measurement itself runs in the audio worklet.
    const id = setInterval(() => {
      const now = performance.now();
      const fps = (frames * 1000) / (now - since);
      frames = 0;
      since = now;
      const ctx = peekAudioContext();
      if (!ctx) return;
      const budget = (128 / ctx.sampleRate) * 1000; // one render block
      setText(
        [
          `detect ${cost.toFixed(2)} ms/frame (audio block budget ${budget.toFixed(2)} ms)`,
          `updates ${fps.toFixed(0)}/s (60 expected; fewer = overloaded)`,
          `${ctx.sampleRate} Hz, latency ${((ctx.baseLatency + (ctx.outputLatency ?? 0)) * 1000).toFixed(0)} ms`,
        ].join('\n'),
      );
    }, 1000);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);

  return (
    <pre
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        margin: 0,
        padding: 8,
        font: '12px/1.4 monospace',
        background: 'var(--button)',
        color: 'var(--text)',
        border: '1px solid var(--divider)',
        borderRadius: 8,
        zIndex: 20,
      }}
    >
      {text}
    </pre>
  );
}
