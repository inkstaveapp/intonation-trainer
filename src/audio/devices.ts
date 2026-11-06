export interface Device {
  id: string;
  label: string;
}

/**
 * Real devices of one kind. Browsers add virtual "default" and "communications" entries that duplicate
 * a real device; the app offers its own "system default" choice instead. Labels are empty until the
 * microphone permission has been granted, so unnamed devices get a numbered fallback.
 */
export function listDevices(
  all: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[],
  kind: MediaDeviceKind,
  fallback: string,
): Device[] {
  return all
    .filter((d) => d.kind === kind && d.deviceId !== 'default' && d.deviceId !== 'communications')
    .map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
}

/** Keeps a saved choice only while that device still exists; otherwise falls back to the default (null). */
export const resolveSelection = (id: string | null, devices: Device[]): string | null =>
  id !== null && devices.some((d) => d.id === id) ? id : null;

/** True when the browser reports no usable microphone at all. Before any permission some browsers list nothing. */
export const noMicDetected = (all: Pick<MediaDeviceInfo, 'kind'>[] | null): boolean =>
  all !== null && !all.some((d) => d.kind === 'audioinput');
