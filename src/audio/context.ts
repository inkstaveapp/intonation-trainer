let ctx: AudioContext | null = null;

/** The shared context if one exists yet; never creates one (no user gesture needed). */
export const peekAudioContext = (): AudioContext | null => ctx;

/** One AudioContext for mic, metronome and scoring so they share a single clock. Call from a user gesture. */
export async function getAudioContext(): Promise<AudioContext> {
  ctx ??= new AudioContext({ latencyHint: 'interactive' });
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}
