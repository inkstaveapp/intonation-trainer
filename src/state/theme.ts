import { create } from 'zustand';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));

/** Applies the theme to one document (the page, or a pop-out window) and matches the browser UI colour. */
export function applyTheme(doc: Document, theme: Theme): void {
  if (theme === 'system') doc.documentElement.removeAttribute('data-theme');
  else doc.documentElement.setAttribute('data-theme', theme);
  const bg = doc.defaultView?.getComputedStyle(doc.body).backgroundColor;
  if (bg) doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}
