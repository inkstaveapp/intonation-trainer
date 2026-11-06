import { create } from 'zustand';

export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type WidgetSize = 's' | 'm' | 'l';

interface WidgetState {
  collapsed: boolean;
  corner: Corner;
  size: WidgetSize;
  /** 0.6 to 1 */
  opacity: number;
  toggleCollapsed: () => void;
  setCorner: (c: Corner) => void;
  cycleSize: () => void;
  setOpacity: (o: number) => void;
}

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { s: 'm', m: 'l', l: 's' };

export const useWidget = create<WidgetState>((set) => ({
  collapsed: false,
  corner: 'br',
  size: 'm',
  opacity: 1,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
  setCorner: (corner) => set({ corner }),
  cycleSize: () => set((s) => ({ size: NEXT_SIZE[s.size] })),
  setOpacity: (o) => set({ opacity: Math.min(1, Math.max(0.6, o)) }),
}));
