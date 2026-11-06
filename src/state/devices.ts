import { create } from 'zustand';
import { listDevices, noMicDetected, resolveSelection, type Device } from '~/audio/devices';
import { canChooseOutput, setOutputDevice } from '~/audio/context';

interface DevicesState {
  inputs: Device[];
  outputs: Device[];
  /** Chosen microphone; null is the system default. */
  inputId: string | null;
  outputId: string | null;
  /** False when the browser reports no microphone; null until the first check. */
  micAvailable: boolean | null;
  /** The browser can route sound to a chosen output. */
  outputChoosable: boolean;
  /** Set when the browser refused to switch the output device. */
  outputFailed: boolean;
  /** Re-reads the device lists. Labels appear once microphone permission has been granted. */
  refresh: (labels: { mic: string; output: string }) => Promise<void>;
  setInput: (id: string | null) => void;
  setOutput: (id: string | null) => Promise<void>;
}

let labels = { mic: 'Microphone', output: 'Output' };

export const useDevices = create<DevicesState>((set, get) => ({
  inputs: [],
  outputs: [],
  inputId: null,
  outputId: null,
  micAvailable: null,
  outputChoosable: canChooseOutput(),
  outputFailed: false,
  refresh: async (l) => {
    labels = l;
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const inputs = listDevices(all, 'audioinput', l.mic);
    const outputs = listDevices(all, 'audiooutput', l.output);
    // A device that was unplugged since it was chosen falls back to the system default.
    set({
      inputs,
      outputs,
      micAvailable: !noMicDetected(all),
      inputId: resolveSelection(get().inputId, inputs),
      outputId: outputs.length ? resolveSelection(get().outputId, outputs) : get().outputId,
    });
  },
  setInput: (inputId) => set({ inputId }),
  setOutput: async (outputId) => {
    set({ outputId, outputFailed: false });
    try {
      await setOutputDevice(outputId);
    } catch {
      set({ outputFailed: true });
    }
  },
}));

// Plugging a device in or out updates the lists without a reload.
navigator.mediaDevices?.addEventListener?.(
  'devicechange',
  () => void useDevices.getState().refresh(labels),
);
