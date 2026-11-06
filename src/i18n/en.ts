export const en = {
  appTitle: 'Intonation Trainer',
  language: 'Language',
  instrument: 'Instrument',
  'tuner.start': 'Start listening',
  'tuner.stop': 'Stop',
  'tuner.tooLoud': 'Too loud: lower the input level',
  'tuner.highLatency': 'High audio latency: Bluetooth headphones?',
  'tuner.paused': 'Paused after silence. Tap to resume',
} as const;

export type Dict = Record<keyof typeof en, string>;
