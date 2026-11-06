import { describe, expect, it } from 'vitest';
import { micErrorKind } from '~/audio/micError';

const err = (name: string) => Object.assign(new Error('x'), { name });

describe('micErrorKind', () => {
  it('reports an insecure page when the microphone API is missing, whatever the error', () => {
    expect(micErrorKind(new TypeError('undefined'), false)).toBe('insecure');
  });
  it('maps permission, device and other failures', () => {
    expect(micErrorKind(err('NotAllowedError'), true)).toBe('denied');
    expect(micErrorKind(err('SecurityError'), true)).toBe('denied');
    expect(micErrorKind(err('NotFoundError'), true)).toBe('noMic');
    expect(micErrorKind(err('AbortError'), true)).toBe('failed');
    expect(micErrorKind(null, true)).toBe('failed');
  });
});
