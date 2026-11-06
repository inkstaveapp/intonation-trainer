let ctx: AudioContext | null = null;
/** The chosen output device (null = system default), applied when the context is created or changes. */
let sinkId: string | null = null;

/** The shared context if one exists yet; never creates one (no user gesture needed). */
export const peekAudioContext = (): AudioContext | null => ctx;

/** Choosing an output device from the page needs AudioContext.setSinkId (Chromium); Firefox and Safari lack it. */
export const canChooseOutput = (): boolean =>
  typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;

/** Routes all sound (metronome, drone, reference tone) to a device. Throws if the browser refuses. */
export async function setOutputDevice(id: string | null): Promise<void> {
  sinkId = id;
  if (ctx && canChooseOutput())
    await (ctx as AudioContext & { setSinkId(id: string): Promise<void> }).setSinkId(id ?? '');
}

/** One AudioContext for mic, metronome and scoring so they share a single clock. Call from a user gesture. */
export async function getAudioContext(): Promise<AudioContext> {
  ctx ??= new AudioContext({
    latencyHint: 'interactive',
    ...(sinkId && canChooseOutput() ? { sinkId } : {}),
  } as AudioContextOptions);
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}
