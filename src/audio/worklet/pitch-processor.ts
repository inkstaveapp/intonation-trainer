import { detectPitch } from '~/audio/mpm';

// Minimal typings for AudioWorkletGlobalScope (not in the DOM lib).
declare const sampleRate: number;
declare const currentTime: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;

const UPDATES_PER_SECOND = 60;

interface Config {
  minHz: number;
  maxHz: number;
  windowSize: number;
  guardTwelfth: boolean;
  prior?: number | undefined;
}

class PitchProcessor extends AudioWorkletProcessor {
  private cfg: Config = { minHz: 190, maxHz: 2600, windowSize: 1024, guardTwelfth: true };
  private ring = new Float32Array(1024);
  private win = new Float32Array(1024);
  private pos = 0;
  private filled = 0;
  private sinceHop = 0;
  private hop = Math.round(sampleRate / UPDATES_PER_SECOND);

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<Config>) => {
      this.cfg = e.data;
      this.ring = new Float32Array(e.data.windowSize);
      this.win = new Float32Array(e.data.windowSize);
      this.pos = this.filled = this.sinceHop = 0;
    };
  }

  process(inputs: Float32Array[][]): boolean {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    const n = this.ring.length;
    for (let i = 0; i < ch.length; i++) {
      this.ring[this.pos] = ch[i]!;
      this.pos = (this.pos + 1) % n;
      this.filled = Math.min(n, this.filled + 1);
      if (++this.sinceHop >= this.hop && this.filled === n) {
        this.sinceHop = 0;
        this.analyse();
      }
    }
    return true;
  }

  private analyse() {
    const n = this.ring.length;
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const v = this.ring[(this.pos + i) % n]!;
      this.win[i] = v;
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const rms = Math.sqrt(sum / n);
    const r = detectPitch(this.win, { sampleRate, ...this.cfg });
    this.port.postMessage({
      freq: r?.freq ?? 0,
      clarity: r?.clarity ?? 0,
      rms,
      peak,
      t: currentTime,
    });
  }
}

registerProcessor('pitch-processor', PitchProcessor);
