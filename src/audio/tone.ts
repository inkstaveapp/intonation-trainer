/** Sustained tone made of harmonics (reference A: [1]; drone: a few partials so it is audible and easy to tune against). */
export class Tone {
  private osc: OscillatorNode[] = [];
  private master: GainNode | null = null;

  constructor(private harmonics: number[]) {}

  get playing(): boolean {
    return this.master !== null;
  }

  start(ctx: AudioContext, freq: number, gain: number): void {
    if (this.master) return;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.setTargetAtTime(gain, ctx.currentTime, 0.03); // fade in: no click
    master.connect(ctx.destination);
    const total = this.harmonics.reduce((a, b) => a + b, 0);
    this.osc = this.harmonics.map((amp, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq * (i + 1);
      const g = ctx.createGain();
      g.gain.value = amp / total;
      o.connect(g).connect(master);
      o.start();
      return o;
    });
    this.master = master;
  }

  setFreq(ctx: AudioContext, freq: number): void {
    this.osc.forEach((o, i) => o.frequency.setTargetAtTime(freq * (i + 1), ctx.currentTime, 0.02));
  }

  setGain(ctx: AudioContext, gain: number): void {
    this.master?.gain.setTargetAtTime(gain, ctx.currentTime, 0.03);
  }

  stop(ctx: AudioContext): void {
    if (!this.master) return;
    const { master, osc } = this;
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    osc.forEach((o) => o.stop(ctx.currentTime + 0.2));
    setTimeout(() => master.disconnect(), 300);
    this.osc = [];
    this.master = null;
  }
}
