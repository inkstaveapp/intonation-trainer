export type MicError = 'insecure' | 'denied' | 'noMic' | 'lost' | 'failed';

/** Why listening could not start, in terms the player can act on. */
export function micErrorKind(err: unknown, hasMediaDevices: boolean): MicError {
  // Without HTTPS or localhost the browser does not offer the microphone API at all.
  if (!hasMediaDevices) return 'insecure';
  const name = (err as { name?: unknown } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'noMic';
  return 'failed';
}
