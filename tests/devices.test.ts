import { describe, expect, it } from 'vitest';
import { listDevices, noMicDetected, resolveSelection } from '~/audio/devices';

const dev = (kind: MediaDeviceKind, deviceId: string, label = '') => ({ kind, deviceId, label });

describe('listDevices', () => {
  const all = [
    dev('audioinput', 'default', 'Default - Built-in mic'),
    dev('audioinput', 'communications', 'Communications - Built-in mic'),
    dev('audioinput', 'a', 'Built-in mic'),
    dev('audioinput', 'b', 'USB interface'),
    dev('audiooutput', 'default', 'Default - Speakers'),
    dev('audiooutput', 'c', 'Speakers'),
    dev('videoinput', 'v', 'Camera'),
  ];
  it('returns real devices of the requested kind without the virtual default entries', () => {
    expect(listDevices(all, 'audioinput', 'Microphone')).toEqual([
      { id: 'a', label: 'Built-in mic' },
      { id: 'b', label: 'USB interface' },
    ]);
    expect(listDevices(all, 'audiooutput', 'Output')).toEqual([{ id: 'c', label: 'Speakers' }]);
  });
  it('numbers devices whose names are hidden until permission is granted', () => {
    const hidden = [dev('audioinput', 'x'), dev('audioinput', 'y')];
    expect(listDevices(hidden, 'audioinput', 'Microphone').map((d) => d.label)).toEqual([
      'Microphone 1',
      'Microphone 2',
    ]);
  });
});

describe('resolveSelection and noMicDetected', () => {
  const list = [{ id: 'a', label: 'A' }];
  it('keeps a choice only while the device exists', () => {
    expect(resolveSelection('a', list)).toBe('a');
    expect(resolveSelection('gone', list)).toBeNull();
    expect(resolveSelection(null, list)).toBeNull();
  });
  it('reports no microphone only when the browser listed devices and none were inputs', () => {
    expect(noMicDetected(null)).toBe(false); // not checked yet
    expect(noMicDetected([])).toBe(true);
    expect(noMicDetected([dev('audiooutput', 'c'), dev('videoinput', 'v')])).toBe(true);
    expect(noMicDetected([dev('audioinput', 'a')])).toBe(false);
  });
});
